from fastapi import FastAPI, HTTPException, Depends, status, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
import os
import sys
from jose import jwt, JWTError
from passlib.context import CryptContext
from bson import ObjectId
from dotenv import load_dotenv

load_dotenv()

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend.imgbb import upload_image_to_imgbb


SECRET_KEY = os.getenv("SECRET_KEY", "devitappsecretkeyforauthentication123")  
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")


app = FastAPI(
    title="DevIT API",
    description="Reddit-like social media API for the DevIT application",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    openapi_tags=[
        {"name": "auth", "description": "Authentication operations"},
        {"name": "posts", "description": "Operations related to posts"},
        {"name": "comments", "description": "Operations related to comments"},
        {"name": "users", "description": "Operations related to user accounts"},
        {"name": "search", "description": "Search functionality"}
    ]
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



env = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
MONGODB_URL = env
client = AsyncIOMotorClient(MONGODB_URL)
database = client.devit_db
posts_collection = database.posts
comments_collection = database.comments
users_collection = database.users


class PostCreate(BaseModel):
    title: str
    content: str
    author: str
    imageUrl: Optional[str] = None
    
class PostCreateForm:
    def __init__(
        self,
        title: str = Form(...),
        content: str = Form(...),
        author: str = Form(...),
        image: Optional[UploadFile] = File(None)
    ):
        self.title = title
        self.content = content
        self.author = author
        self.image = image

class PostUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    imageUrl: Optional[str] = None
    
class PostUpdateForm:
    def __init__(
        self,
        title: Optional[str] = Form(None),
        content: Optional[str] = Form(None),
        image: Optional[UploadFile] = File(None),
        remove_image: bool = Form(False)
    ):
        self.title = title
        self.content = content
        self.image = image
        self.remove_image = remove_image

class PostResponse(BaseModel):
    id: str
    title: str
    content: str
    author: str
    user_id: Optional[str] = None
    upvotes: int
    downvotes: int
    imageUrl: Optional[str] = None
    comments_count: Optional[int] = 0

class VoteRequest(BaseModel):
    vote_type: str  

class CommentCreate(BaseModel):
    post_id: str
    text: str
    username: str
    user_id: Optional[str] = None

class CommentResponse(BaseModel):
    id: str
    post_id: str
    text: str
    username: str
    user_id: Optional[str] = None
    upvotes: int
    downvotes: int
    created_at: datetime

class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    
class UserLogin(BaseModel):
    email: str
    password: str
    
class UserProfile(BaseModel):
    id: str
    username: str
    email: str
    karma: int
    created_at: datetime
    bio: Optional[str] = None
    
class PasswordChange(BaseModel):
    current_password: str
    new_password: str
    
class PasswordResetRequest(BaseModel):
    email: str
    
class PasswordReset(BaseModel):
    email: str
    reset_code: str
    new_password: str
    
class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: str
    username: str
    refresh_token: Optional[str] = None
    
class TokenData(BaseModel):
    user_id: Optional[str] = None
    username: Optional[str] = None


def post_helper(post) -> dict:
    
    return {
        "id": str(post["_id"]),
        "title": post["title"],
        "content": post["content"],
        "author": post["author"],
        "user_id": post.get("user_id", ""),
        "upvotes": post["upvotes"],
        "downvotes": post["downvotes"],
        "imageUrl": post.get("imageUrl"),
        "comments_count": post.get("comments_count", 0),
        "voters": post.get("voters", {"upvoters": [], "downvoters": []})
    }

def comment_helper(comment) -> dict:
    
    created_at = comment["created_at"]
    if isinstance(created_at, datetime):
        created_at_iso = created_at.isoformat()
    else:
        
        created_at_iso = created_at
        
    return {
        "id": str(comment["_id"]),
        "post_id": str(comment["post_id"]),
        "text": comment["text"],
        "username": comment["username"],
        "user_id": comment.get("user_id"),
        "upvotes": comment["upvotes"],
        "downvotes": comment["downvotes"],
        "created_at": created_at_iso,
        "voters": comment.get("voters", {"upvoters": [], "downvoters": []})
    }
    
def user_helper(user) -> dict:
    return {
        "id": str(user["_id"]),
        "username": user["username"],
        "email": user["email"],
        "karma": user.get("karma", 0),
        "created_at": user["created_at"],
        "bio": user.get("bio", "")
    }


def verify_password(plain_password, hashed_password):
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    """Hash a password for storage"""
    return pwd_context.hash(password)

async def get_user_by_email(email: str):
    """Get user by email"""
    return await users_collection.find_one({"email": email})

async def authenticate_user(email: str, password: str):
    """Authenticate a user by email and password"""
    user = await get_user_by_email(email)
    if not user:
        return False
    if not verify_password(password, user["password"]):
        return False
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    """Get the current authenticated user from the token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        token_data = TokenData(user_id=user_id)
    except JWTError:
        raise credentials_exception
    
    user = await users_collection.find_one({"_id": ObjectId(token_data.user_id)})
    if user is None:
        raise credentials_exception
    return user

@app.get("/", tags=["health"])
async def root():
    """Health check endpoint to verify API is running"""
    return {
        "message": "DevIT API is running!",
        "status": "online",
        "version": "1.0.0",
        "docs_url": "/docs"
    }


@app.post("/login", response_model=Token, tags=["auth"])
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """Login with username/email and password to get access token"""
    
    user = None
    if "@" in form_data.username:
        user = await get_user_by_email(form_data.username)
    else:
        user = await users_collection.find_one({"username": form_data.username})
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not verify_password(form_data.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user["_id"])},
        expires_delta=access_token_expires
    )
    
    
    refresh_token_expires = timedelta(days=30)  
    refresh_token = create_access_token(
        data={"sub": str(user["_id"]), "refresh": True},
        expires_delta=refresh_token_expires
    )
    
    
    await users_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {"refresh_token": get_password_hash(refresh_token)}}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": str(user["_id"]),
        "username": user["username"],
        "refresh_token": refresh_token
    }

@app.post("/login/email", response_model=Token, tags=["auth"])
async def login_with_email(user_data: UserLogin):
    """Login with email and password to get access token (for mobile apps)"""
    user = await authenticate_user(user_data.email, user_data.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user["_id"])},
        expires_delta=access_token_expires
    )
    
    
    refresh_token_expires = timedelta(days=30)  
    refresh_token = create_access_token(
        data={"sub": str(user["_id"]), "refresh": True},
        expires_delta=refresh_token_expires
    )
    
    
    await users_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {"refresh_token": get_password_hash(refresh_token)}}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": str(user["_id"]),
        "username": user["username"],
        "refresh_token": refresh_token
    }


@app.get("/posts", response_model=List[PostResponse], tags=["posts"])
async def get_posts(skip: int = 0, limit: int = 10, sort: str = "newest"):
    """Get all posts with optional sorting"""
    
    sort_options = {
        "newest": [("created_at", -1)],
        "oldest": [("created_at", 1)],
        "most_upvoted": [("upvotes", -1), ("created_at", -1)],
        "most_downvoted": [("downvotes", -1), ("created_at", -1)]
    }
    
    
    sort_option = sort_options.get(sort, sort_options["newest"])
    
    posts = []
    cursor = posts_collection.find().sort(sort_option).skip(skip).limit(limit)
    
    async for post in cursor:
        
        comment_count = await comments_collection.count_documents({"post_id": post["_id"]})
        post["comments_count"] = comment_count
        posts.append(post_helper(post))
    
    return posts

@app.get("/posts/{post_id}", response_model=PostResponse, tags=["posts"])
async def get_post(post_id: str):
    """Get a specific post by ID"""
    try:
        object_id = ObjectId(post_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid post ID")
    
    post = await posts_collection.find_one({"_id": object_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    
    comment_count = await comments_collection.count_documents({"post_id": object_id})
    post["comments_count"] = comment_count
    
    return post_helper(post)

@app.post("/posts", response_model=PostResponse, tags=["posts"])
async def create_post(post: PostCreate, current_user: dict = Depends(get_current_user)):
    """Create a new post with optional image URL"""
    post_dict = {
        "title": post.title,
        "content": post.content,
        "author": post.author if post.author else current_user["username"],
        "user_id": str(current_user["_id"]),
        "imageUrl": post.imageUrl,
        "upvotes": 0,
        "downvotes": 0,
        "created_at": datetime.utcnow()
    }
    
    result = await posts_collection.insert_one(post_dict)
    new_post = await posts_collection.find_one({"_id": result.inserted_id})
    return post_helper(new_post)

@app.post("/posts/with-image", response_model=PostResponse, tags=["posts"])
async def create_post_with_image(
    post_data: PostCreateForm = Depends(),
    current_user: dict = Depends(get_current_user)
):
    """Create a new post with an uploaded image"""
    image_url = None
    
    
    if post_data.image:
        try:
            
            image_bytes = await post_data.image.read()
            
            
            print(f"Received image: {post_data.image.filename}, size: {len(image_bytes)} bytes")
            
            
            image_url = upload_image_to_imgbb(image_bytes)
            
            
            print(f"Image uploaded successfully, URL: {image_url}")
        except Exception as e:
            print(f"Image upload failed: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Image upload failed: {str(e)}"
            )
    
    post_dict = {
        "title": post_data.title,
        "content": post_data.content,
        "author": post_data.author if post_data.author else current_user["username"],
        "user_id": str(current_user["_id"]),
        "imageUrl": image_url,
        "upvotes": 0,
        "downvotes": 0,
        "created_at": datetime.utcnow()
    }
    
    result = await posts_collection.insert_one(post_dict)
    new_post = await posts_collection.find_one({"_id": result.inserted_id})
    return post_helper(new_post)

@app.put("/posts/{post_id}", response_model=PostResponse, tags=["posts"])
async def update_post(post_id: str, update_data: PostUpdate, current_user: dict = Depends(get_current_user)):
    """Update a post with JSON data - only the author can edit their own posts"""
    try:
        object_id = ObjectId(post_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid post ID")
    
    post = await posts_collection.find_one({"_id": object_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    
    if post.get("user_id") != str(current_user["_id"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only edit your own posts"
        )
    
    
    update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
    
    if update_dict:
        await posts_collection.update_one(
            {"_id": object_id},
            {"$set": update_dict}
        )
    
    updated_post = await posts_collection.find_one({"_id": object_id})
    return post_helper(updated_post)

@app.put("/posts/{post_id}/form", response_model=PostResponse, tags=["posts"])
async def update_post_with_image(
    post_id: str, 
    update_data: PostUpdateForm = Depends(),
    current_user: dict = Depends(get_current_user)
):
    """Update a post with form data and optional image upload - only the author can edit their own posts"""
    try:
        object_id = ObjectId(post_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid post ID")
    
    post = await posts_collection.find_one({"_id": object_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    
    if post.get("user_id") != str(current_user["_id"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only edit your own posts"
        )
    
    
    update_dict = {}
    
    if update_data.title is not None:
        update_dict["title"] = update_data.title
        
    if update_data.content is not None:
        update_dict["content"] = update_data.content
    
    
    if update_data.image:
        try:
            
            image_bytes = await update_data.image.read()
            
            
            image_url = upload_image_to_imgbb(image_bytes)
            update_dict["imageUrl"] = image_url
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Image upload failed: {str(e)}"
            )
    elif update_data.remove_image:
        
        update_dict["imageUrl"] = None
    
    if update_dict:
        await posts_collection.update_one(
            {"_id": object_id},
            {"$set": update_dict}
        )
    
    updated_post = await posts_collection.find_one({"_id": object_id})
    return post_helper(updated_post)


@app.delete("/posts/{post_id}", tags=["posts"])
async def delete_post(post_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a post and its comments - only the author can delete their own posts"""
    try:
        object_id = ObjectId(post_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid post ID")
    
    post = await posts_collection.find_one({"_id": object_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    
    if post.get("user_id") != str(current_user["_id"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own posts"
        )
    
    
    await posts_collection.delete_one({"_id": object_id})
    
    
    await comments_collection.delete_many({"post_id": object_id})
    
    return {"message": "Post and comments deleted successfully"}

@app.post("/posts/{post_id}/vote", tags=["posts"])
async def vote_post(post_id: str, vote: VoteRequest, current_user: dict = Depends(get_current_user)):
    """Vote on a post (upvote, downvote, remove_upvote, or remove_downvote)"""
    try:
        object_id = ObjectId(post_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid post ID")
    
    post = await posts_collection.find_one({"_id": object_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    user_id = str(current_user["_id"])
    
    
    if "voters" not in post:
        await posts_collection.update_one(
            {"_id": object_id},
            {"$set": {"voters": {"upvoters": [], "downvoters": []}}}
        )
        post = await posts_collection.find_one({"_id": object_id})
    
    voters = post.get("voters", {"upvoters": [], "downvoters": []})
    upvoters = voters.get("upvoters", [])
    downvoters = voters.get("downvoters", [])
    
    
    if vote.vote_type == "upvote":
        
        if user_id in upvoters:
            
            return {
                **post_helper(post),
                "message": "Already upvoted",
                "action": "none"
            }
        
        
        if user_id in downvoters:
            update_operation = {
                "$pull": {"voters.downvoters": user_id},
                "$push": {"voters.upvoters": user_id},
                "$inc": {"upvotes": 1, "downvotes": -1}
            }
        else:
            update_operation = {
                "$push": {"voters.upvoters": user_id},
                "$inc": {"upvotes": 1}
            }
            
    elif vote.vote_type == "downvote":
        
        if user_id in downvoters:
            
            return {
                **post_helper(post),
                "message": "Already downvoted",
                "action": "none"
            }
        
        
        if user_id in upvoters:
            update_operation = {
                "$pull": {"voters.upvoters": user_id},
                "$push": {"voters.downvoters": user_id},
                "$inc": {"upvotes": -1, "downvotes": 1}
            }
        else:
            update_operation = {
                "$push": {"voters.downvoters": user_id},
                "$inc": {"downvotes": 1}
            }
            
    elif vote.vote_type == "remove_upvote":
        
        if user_id not in upvoters:
            
            return {
                **post_helper(post),
                "message": "Not upvoted",
                "action": "none"
            }
        
        update_operation = {
            "$pull": {"voters.upvoters": user_id},
            "$inc": {"upvotes": -1}
        }
        
    elif vote.vote_type == "remove_downvote":
        
        if user_id not in downvoters:
            
            return {
                **post_helper(post),
                "message": "Not downvoted",
                "action": "none"
            }
        
        update_operation = {
            "$pull": {"voters.downvoters": user_id},
            "$inc": {"downvotes": -1}
        }
    else:
        raise HTTPException(status_code=400, detail="Invalid vote type")
    
    await posts_collection.update_one(
        {"_id": object_id},
        update_operation
    )
    
    updated_post = await posts_collection.find_one({"_id": object_id})
    return post_helper(updated_post)


@app.get("/posts/{post_id}/comments", tags=["comments"])
async def get_comments(post_id: str):
    """Get all comments for a post"""
    try:
        object_id = ObjectId(post_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid post ID")
    
    comments = []
    async for comment in comments_collection.find({"post_id": object_id}).sort("created_at", -1):
        comments.append(comment_helper(comment))
    
    return comments

@app.post("/comments", response_model=CommentResponse, tags=["comments"])
async def create_comment(comment: CommentCreate):
    """Create a new comment"""
    try:
        post_id = ObjectId(comment.post_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid post ID")
    
    
    post = await posts_collection.find_one({"_id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    comment_dict = {
        "post_id": post_id,
        "text": comment.text,
        "username": comment.username,
        "user_id": comment.user_id,
        "upvotes": 0,
        "downvotes": 0,
        "created_at": datetime.utcnow()
    }
    
    result = await comments_collection.insert_one(comment_dict)
    new_comment = await comments_collection.find_one({"_id": result.inserted_id})
    return comment_helper(new_comment)

@app.post("/comments/{comment_id}/vote", tags=["comments"])
async def vote_comment(comment_id: str, vote: VoteRequest, current_user: dict = Depends(get_current_user)):
    """Vote on a comment (upvote, downvote, remove_upvote, or remove_downvote)"""
    try:
        object_id = ObjectId(comment_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid comment ID")
    
    comment = await comments_collection.find_one({"_id": object_id})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    user_id = str(current_user["_id"])
    
    
    if "voters" not in comment:
        await comments_collection.update_one(
            {"_id": object_id},
            {"$set": {"voters": {"upvoters": [], "downvoters": []}}}
        )
        comment = await comments_collection.find_one({"_id": object_id})
    
    voters = comment.get("voters", {"upvoters": [], "downvoters": []})
    upvoters = voters.get("upvoters", [])
    downvoters = voters.get("downvoters", [])
    
    
    if vote.vote_type == "upvote":
        
        if user_id in upvoters:
            
            return {
                **comment_helper(comment),
                "message": "Already upvoted",
                "action": "none"
            }
        
        
        if user_id in downvoters:
            update_operation = {
                "$pull": {"voters.downvoters": user_id},
                "$push": {"voters.upvoters": user_id},
                "$inc": {"upvotes": 1, "downvotes": -1}
            }
        else:
            update_operation = {
                "$push": {"voters.upvoters": user_id},
                "$inc": {"upvotes": 1}
            }
            
    elif vote.vote_type == "downvote":
        
        if user_id in downvoters:
            
            return {
                **comment_helper(comment),
                "message": "Already downvoted",
                "action": "none"
            }
        
        
        if user_id in upvoters:
            update_operation = {
                "$pull": {"voters.upvoters": user_id},
                "$push": {"voters.downvoters": user_id},
                "$inc": {"upvotes": -1, "downvotes": 1}
            }
        else:
            update_operation = {
                "$push": {"voters.downvoters": user_id},
                "$inc": {"downvotes": 1}
            }
            
    elif vote.vote_type == "remove_upvote":
        
        if user_id not in upvoters:
            
            return {
                **comment_helper(comment),
                "message": "Not upvoted",
                "action": "none"
            }
        
        update_operation = {
            "$pull": {"voters.upvoters": user_id},
            "$inc": {"upvotes": -1}
        }
        
    elif vote.vote_type == "remove_downvote":
        
        if user_id not in downvoters:
            
            return {
                **comment_helper(comment),
                "message": "Not downvoted",
                "action": "none"
            }
        
        update_operation = {
            "$pull": {"voters.downvoters": user_id},
            "$inc": {"downvotes": -1}
        }
    else:
        raise HTTPException(status_code=400, detail="Invalid vote type")
    
    await comments_collection.update_one(
        {"_id": object_id},
        update_operation
    )
    
    updated_comment = await comments_collection.find_one({"_id": object_id})
    return comment_helper(updated_comment)



@app.post("/users", response_model=UserProfile, tags=["users"])
async def create_user(user: UserCreate):
    """Create a new user (sign up)"""
    
    existing_user = await users_collection.find_one({"username": user.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    
    existing_email = await users_collection.find_one({"email": user.email})
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already in use")
    
    
    hashed_password = get_password_hash(user.password)
    
    user_dict = {
        "username": user.username,
        "email": user.email,
        "password": hashed_password,
        "karma": 0,
        "created_at": datetime.utcnow(),
        "bio": ""
    }
    
    result = await users_collection.insert_one(user_dict)
    new_user = await users_collection.find_one({"_id": result.inserted_id})
    return user_helper(new_user)

@app.post("/register", response_model=Token, tags=["auth"])
async def register(user: UserCreate):
    """Register a new user and return access token (for mobile apps)"""
    
    existing_user = await users_collection.find_one({"username": user.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    
    existing_email = await users_collection.find_one({"email": user.email})
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already in use")
    
    
    hashed_password = get_password_hash(user.password)
    
    user_dict = {
        "username": user.username,
        "email": user.email,
        "password": hashed_password,
        "karma": 0,
        "created_at": datetime.utcnow(),
        "bio": ""
    }
    
    result = await users_collection.insert_one(user_dict)
    new_user = await users_collection.find_one({"_id": result.inserted_id})
    
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(new_user["_id"])},
        expires_delta=access_token_expires
    )
    
    
    refresh_token_expires = timedelta(days=30)  
    refresh_token = create_access_token(
        data={"sub": str(new_user["_id"]), "refresh": True},
        expires_delta=refresh_token_expires
    )
    
    
    await users_collection.update_one(
        {"_id": new_user["_id"]},
        {"$set": {"refresh_token": get_password_hash(refresh_token)}}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": str(new_user["_id"]),
        "username": new_user["username"],
        "refresh_token": refresh_token
    }

@app.post("/logout", tags=["auth"])
async def logout(current_user: dict = Depends(get_current_user)):
    """Logout the current user by invalidating their refresh token"""
    await users_collection.update_one(
        {"_id": current_user["_id"]},
        {"$unset": {"refresh_token": ""}}
    )
    return {"message": "Successfully logged out"}

@app.get("/users/profile", response_model=UserProfile, tags=["users", "auth"])
async def get_current_user_profile(current_user: dict = Depends(get_current_user)):
    """Get the current authenticated user's profile"""
    return user_helper(current_user)



@app.post("/users/change-password", tags=["users", "auth"])
async def change_password(password_data: PasswordChange, current_user: dict = Depends(get_current_user)):
    """Change the user's password"""
    
    if not verify_password(password_data.current_password, current_user["password"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    
    hashed_password = get_password_hash(password_data.new_password)
    
    
    await users_collection.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"password": hashed_password}}
    )
    
    return {"message": "Password changed successfully"}



@app.post("/reset-password-request", tags=["auth"])
async def request_password_reset(reset_request: PasswordResetRequest):
    """Request a password reset code (In a real app, this would send an email)"""
    user = await get_user_by_email(reset_request.email)
    if not user:
        
        return {"message": "If the email exists, a reset code has been sent."}
    
    
    import random
    reset_code = str(random.randint(100000, 999999))
    
    
    expiry = datetime.utcnow() + timedelta(hours=1)
    
    
    await users_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {
            "reset_code": reset_code,
            "reset_code_expiry": expiry
        }}
    )
    
    
    
    return {
        "message": "If the email exists, a reset code has been sent.",
        "dev_only": {
            "reset_code": reset_code,
            "email": reset_request.email
        }
    }



@app.post("/reset-password", tags=["auth"])
async def confirm_password_reset(reset_data: PasswordReset):
    """Confirm a password reset with the code and set a new password"""
    user = await get_user_by_email(reset_data.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email or reset code"
        )
    
    
    if "reset_code" not in user or "reset_code_expiry" not in user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No reset code requested or it has expired"
        )
    
    
    if user["reset_code"] != reset_data.reset_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid reset code"
        )
    
    
    if datetime.utcnow() > user["reset_code_expiry"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset code has expired"
        )
    
    
    hashed_password = get_password_hash(reset_data.new_password)
    
    
    await users_collection.update_one(
        {"_id": user["_id"]},
        {
            "$set": {"password": hashed_password},
            "$unset": {"reset_code": "", "reset_code_expiry": ""}
        }
    )
    
    return {"message": "Password has been reset successfully"}



@app.get("/search", tags=["search", "posts"])
async def search_posts(query: str):
    """Search for posts by title or content"""
    if not query or len(query) < 3:
        raise HTTPException(status_code=400, detail="Search query must be at least 3 characters long")
    
    
    
    search_results = []
    cursor = posts_collection.find({
        "$or": [
            {"title": {"$regex": query, "$options": "i"}},
            {"content": {"$regex": query, "$options": "i"}},
            {"author": {"$regex": query, "$options": "i"}}
        ]
    }).sort("created_at", -1)
    
    async for post in cursor:
        
        comment_count = await comments_collection.count_documents({"post_id": post["_id"]})
        post["comments_count"] = comment_count
        search_results.append(post_helper(post))
    
    return search_results




if __name__ == "__main__":
    import uvicorn
    print("Starting DevIT FastAPI server...")
    print("API Documentation available at: http://localhost:8000/docs")
    uvicorn.run(app, host="0.0.0.0", port=8000)
