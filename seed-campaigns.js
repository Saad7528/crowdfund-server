const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const uri = process.env.MONGO_URI || "mongodb+srv://crowdfund:D2tBfpXBmqzEzhFI@sadasaad.pszei0q.mongodb.net/crowdfunding?retryWrites=true&w=majority&appName=SadaSaad";

const demoCampaigns = [
  {
    title: "AquaFilter: Portable Solar Water Purifier",
    story: "AquaFilter is a solar-powered water filtration device designed for travelers, adventurers, and off-grid communities. It removes 99.9% of bacteria and heavy metals using clean solar energy. Support us to manufacture the first batch and bring clean water to everyone.",
    category: "Technology",
    funding_goal: 5000,
    minimum_contribution: 25,
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    reward_info: "Receive a first-edition AquaFilter unit and a thank-you note.",
    image_url: "https://images.unsplash.com/photo-1548247416-ec66f4900b2e?auto=format&fit=crop&q=80&w=800",
    creator_email: "creator@crowdfund.com",
    creator_name: "GreenTech Innovations",
    amount_raised: 1250,
    status: "approved",
    createdAt: new Date()
  },
  {
    title: "Echoes of Silence: Sci-Fi Short Film",
    story: "An introspective science fiction short film detailing a lonely astronaut's journey to the edge of the galaxy. Your funds will help cover post-production, visual effects, and film festival submission fees. Join us in making this cinematic dream a reality.",
    category: "Art",
    funding_goal: 3000,
    minimum_contribution: 15,
    deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
    reward_info: "Digital download of the film, behind-the-scenes booklet, and your name in credits.",
    image_url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=800",
    creator_email: "creator@crowdfund.com",
    creator_name: "Nebula Cinematic",
    amount_raised: 450,
    status: "approved",
    createdAt: new Date()
  },
  {
    title: "Urban Greenhouse Community Project",
    story: "We are transforming an abandoned lot in the city center into a flourishing community greenhouse. The space will offer free fresh vegetables, educational workshops for kids, and a green peaceful sanctuary for everyone. Back us to purchase seeds and build structures.",
    category: "Community",
    funding_goal: 2500,
    minimum_contribution: 10,
    deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    reward_info: "A hand-written thank-you card and your name engraved on the community wall.",
    image_url: "https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&q=80&w=800",
    creator_email: "creator@crowdfund.com",
    creator_name: "Community Greens",
    amount_raised: 820,
    status: "approved",
    createdAt: new Date()
  }
];

async function seed() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log("Connected to MongoDB for seeding campaigns...");
    
    const db = client.db("crowdfunding");
    const campaignsCollection = db.collection("campaigns");
    
    // Clear existing campaigns to prevent duplicates
    await campaignsCollection.deleteMany({});
    
    // Insert new campaigns
    const result = await campaignsCollection.insertMany(demoCampaigns);
    console.log(`Successfully seeded ${result.insertedCount} campaigns into the database!`);
  } catch (error) {
    console.error("Error seeding campaigns:", error);
  } finally {
    await client.close();
  }
}

seed();
