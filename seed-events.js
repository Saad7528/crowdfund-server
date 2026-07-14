const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGO_URI || "mongodb+srv://crowdfund:D2tBfpXBmqzEzhFI@sadasaad.pszei0q.mongodb.net/crowdfunding?retryWrites=true&w=majority&appName=SadaSaad";

const eventsData = [
  {
    title: "Summer Music Festival",
    date: new Date("2026-06-15"),
    location: "Dhaka, Bangladesh",
    image: "https://images.unsplash.com/photo-1534841224259-c770c7bb6a95",
    description: "Enjoy the best local and international artists in a one-day festival!"
  },
  {
    title: "Art & Craft Workshop",
    date: new Date("2026-07-05"),
    location: "Chittagong, Bangladesh",
    image: "https://images.unsplash.com/photo-1590853566724-83bc9da30d15",
    description: "Hands-on experience in modern art and traditional crafts."
  },
  {
    title: "Tech Innovators Conference",
    date: new Date("2026-08-20"),
    location: "Dhaka, Bangladesh",
    image: "https://images.unsplash.com/photo-1523961131990-5ea7c61b2107",
    description: "Connect with industry leaders and explore the latest tech innovations."
  },
  {
    title: "Culinary Arts Expo",
    date: new Date("2026-09-10"),
    location: "Khulna, Bangladesh",
    image: "https://images.unsplash.com/photo-1543353071-873f17a7a088",
    description: "Discover gourmet dishes and culinary techniques from top chefs."
  },
  {
    title: "Startup Pitch Night",
    date: new Date("2026-07-22"),
    location: "Sylhet, Bangladesh",
    image: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d",
    description: "Pitch your startup idea to investors and get valuable feedback."
  },
  {
    title: "Photography Meetup",
    date: new Date("2026-06-30"),
    location: "Dhaka, Bangladesh",
    image: "https://images.unsplash.com/photo-1763688506555-c73c1b944080",
    description: "Join photography enthusiasts for a day of workshops and shooting sessions."
  },
  {
    title: "Yoga & Wellness Retreat",
    date: new Date("2026-08-05"),
    location: "Cox's Bazar, Bangladesh",
    image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e",
    description: "Relax, rejuvenate, and learn holistic wellness practices by the beach."
  },
  {
    title: "Blockchain & Crypto Summit",
    date: new Date("2026-09-15"),
    location: "Dhaka, Bangladesh",
    image: "https://images.unsplash.com/photo-1551836022-d5d88e9218df",
    description: "Explore blockchain technology and crypto trends with industry experts."
  },
  {
    title: "Environmental Awareness Fair",
    date: new Date("2026-07-28"),
    location: "Barishal, Bangladesh",
    image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee",
    description: "Participate in workshops and talks promoting sustainability and green living."
  },
  {
    title: "Film & Media Festival",
    date: new Date("2026-10-02"),
    location: "Dhaka, Bangladesh",
    image: "https://images.unsplash.com/photo-1542744095-fcf48d80b0fd",
    description: "Watch screenings and network with filmmakers and media professionals."
  }
];

async function seed() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log("Connected to MongoDB for seeding events...");
    
    const db = client.db("crowdfunding");
    const eventsCollection = db.collection("events");
    
    // Clear existing events to prevent duplicates on multiple runs
    await eventsCollection.deleteMany({});
    
    // Insert new events
    const result = await eventsCollection.insertMany(eventsData);
    console.log(`Successfully seeded ${result.insertedCount} events into the database!`);
  } catch (error) {
    console.error("Error seeding events:", error);
  } finally {
    await client.close();
  }
}

seed();
