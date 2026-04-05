from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017")
db = client["bazaar"]

users = db["users"]
listings = db["listings"]
offers = db["offers"]
watchlist = db["watchlist"]
notifications = db["notifications"]
reports = db["reports"]
messages = db["messages"]
chats=db["chats"]
listings = db["listings"]
transactions = db["transactions"]
reviews = db["reviews"]
reports = db["reports"]
conversations = db["conversations"]