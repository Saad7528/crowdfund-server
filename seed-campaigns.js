const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGO_URI;
if (!uri) {
  console.error("Error: MONGO_URI environment variable is missing in .env file!");
  process.exit(1);
}

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
  },
  {
    title: "BioGrow: Intelligent Indoor Garden",
    story: "BioGrow is an automatic smart planter with LED growth lamps and self-watering sensors. Grow fresh herbs, vegetables, and flowers inside your apartment year-round with zero effort.",
    category: "Technology",
    funding_goal: 4000,
    minimum_contribution: 20,
    deadline: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
    reward_info: "One BioGrow smart planter kit and starter organic seed packs.",
    image_url: "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&q=80&w=800",
    creator_email: "creator@crowdfund.com",
    creator_name: "GreenTech Innovations",
    amount_raised: 1500,
    status: "approved",
    createdAt: new Date()
  },
  {
    title: "Beyond the Horizon: Photography Book",
    story: "A high-quality coffee table book capturing breathtaking landscapes and stories from the most remote villages in Bangladesh. Your pledge helps publish and print the first run.",
    category: "Art",
    funding_goal: 2000,
    minimum_contribution: 30,
    deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    reward_info: "Signed hardcover copy of the book and high-res digital prints.",
    image_url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&q=80&w=800",
    creator_email: "creator@crowdfund.com",
    creator_name: "Nebula Cinematic",
    amount_raised: 900,
    status: "approved",
    createdAt: new Date()
  },
  {
    title: "Clean Rivers Clean Oceans Project",
    story: "We are organizing massive weekend cleanup events to remove plastics and waste from local rivers. Funding goes towards trash booms, recycling bins, and volunteer tools.",
    category: "Community",
    funding_goal: 6000,
    minimum_contribution: 5,
    deadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
    reward_info: "Official cleanup volunteer badge and project report inclusion.",
    image_url: "https://images.unsplash.com/photo-1618477388954-7852f32655ec?auto=format&fit=crop&q=80&w=800",
    creator_email: "creator@crowdfund.com",
    creator_name: "Community Greens",
    amount_raised: 3200,
    status: "approved",
    createdAt: new Date()
  },
  {
    title: "LearnCode: Coding for Kids",
    story: "A gamified web platform that teaches coding fundamentals to kids through interactive puzzles and storytelling. Support us to design new modules and levels.",
    category: "Technology",
    funding_goal: 4500,
    minimum_contribution: 15,
    deadline: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000),
    reward_info: "Early-access code for 1 year premium platform subscription.",
    image_url: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80&w=800",
    creator_email: "creator@crowdfund.com",
    creator_name: "GreenTech Innovations",
    amount_raised: 1800,
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
    
    // Clear existing campaigns
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
