import asyncio
from contextlib import asynccontextmanager
from models.database import db_manager
from models.writer import insert_case, insert_simulation, insert_round, insert_persona
from models.reader import *
from models.writer import * 

from fastapi import FastAPI
from routes import read_router
from routes import write_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    await db_manager.connect()
    yield
    await db_manager.close()

app = FastAPI(lifespan=lifespan)

app.include_router(read_router.router)
app.include_router(write_router.router)

### Put fastapi stuff here, ensure use of routers to decrease random stuff in her### Put fastapi stuff here, ensure use of routers to decrease random stuff in heree
@app.get("/")
async def root():
    return {"message": "Hello"}

