const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder_key');
const { verifyToken, verifyAdmin, verifyCreator, verifySupporter } = require('./middleware');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json());

// MongoDB connection
const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/crowdfunding";
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let db, usersCollection, campaignsCollection, contributionsCollection, withdrawalsCollection, paymentsCollection, notificationsCollection, reportsCollection;

async function run() {
  try {
    // Connect to MongoDB
    await client.connect();
    console.log("Connected successfully to MongoDB!");
    
    db = client.db("crowdfunding");
    usersCollection = db.collection("users");
    campaignsCollection = db.collection("campaigns");
    contributionsCollection = db.collection("contributions");
    withdrawalsCollection = db.collection("withdrawals");
    paymentsCollection = db.collection("payments");
    notificationsCollection = db.collection("notifications");
    reportsCollection = db.collection("reports");

    // Seed default admin if not exists. This ensures that the administrator account
    // is pre-registered on system launch for testing role-based dashboard operations.
    const adminEmail = 'admin@crowdfund.com';
    const existingAdmin = await usersCollection.findOne({ email: adminEmail });
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('adminPassword', 10);
      const adminUser = {
        name: 'Site Administrator',
        email: adminEmail,
        photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
        role: 'Admin',
        credits: 0,
        raised_credits: 0,
        password: hashedPassword,
        createdAt: new Date()
      };
      await usersCollection.insertOne(adminUser);
      console.log('Seeded default admin: admin@crowdfund.com / adminPassword');
    }

    // --- JWT & Auth API ---
    
    // POST /jwt generates a JWT token for the user. It looks up the email in the database 
    // to sign the token with the verified role from the DB, ensuring secure authorization.
    app.post('/jwt', async (req, res) => {
      const { email } = req.body;
      if (!email) {
        return res.status(400).send({ message: 'Email is required' });
      }
      const user = await usersCollection.findOne({ email });
      if (!user) {
        return res.status(404).send({ message: 'User not found' });
      }
      const token = jwt.sign(
        { email: user.email, role: user.role },
        process.env.JWT_SECRET || 'secret_key_123',
        { expiresIn: '7d' }
      );
      res.send({ token, role: user.role });
    });

    // Login route (Email/Password). Validates credentials, compares hashed passwords
    // using bcryptjs, and responds with a fresh JWT token and user info profile.
    app.post('/login', async (req, res) => {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).send({ message: 'Email and password are required' });
      }
      const user = await usersCollection.findOne({ email });
      if (!user) {
        return res.status(400).send({ message: 'Invalid email or password' });
      }
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(400).send({ message: 'Invalid email or password' });
      }
      const token = jwt.sign(
        { email: user.email, role: user.role },
        process.env.JWT_SECRET || 'secret_key_123',
        { expiresIn: '7d' }
      );
      res.send({ token, user: { name: user.name, email: user.email, photoURL: user.photoURL, role: user.role, credits: user.credits } });
    });

    // Check if email exists
    app.get('/users/check/:email', async (req, res) => {
      const email = req.params.email;
      const user = await usersCollection.findOne({ email });
      res.send({ exists: !!user });
    });

    // Register User
    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.status(400).send({ message: 'User with this email already exists' });
      }

      const hashedPassword = await bcrypt.hash(user.password, 10);
      
      let credits = 0;
      if (user.role === 'Supporter') credits = 50;
      else if (user.role === 'Creator') credits = 20;

      const newUser = {
        name: user.name,
        email: user.email,
        photoURL: user.photoURL || '',
        role: user.role || 'Supporter',
        credits: credits,
        raised_credits: 0,
        password: hashedPassword,
        createdAt: new Date()
      };

      const result = await usersCollection.insertOne(newUser);
      res.send(result);
    });

    // Social login/sync user (Google Sign-In)
    app.post('/users/social', async (req, res) => {
      const user = req.body; // { name, email, photoURL, role }
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);
      
      if (existingUser) {
        // Just return existing user data (excluding password)
        const { password, ...userInfo } = existingUser;
        return res.send({ user: userInfo, isNew: false });
      }
      
      // Creating a new user through Google login (defaults to Supporter if not specified)
      const role = user.role || 'Supporter';
      let credits = role === 'Supporter' ? 50 : 20;

      // Dummy random password since social login handles auth
      const dummyPassword = Math.random().toString(36).slice(-10);
      const hashedPassword = await bcrypt.hash(dummyPassword, 10);

      const newUser = {
        name: user.name,
        email: user.email,
        photoURL: user.photoURL || '',
        role: role,
        credits: credits,
        raised_credits: 0,
        password: hashedPassword,
        createdAt: new Date()
      };

      await usersCollection.insertOne(newUser);
      const { password, ...userInfo } = newUser;
      res.send({ user: userInfo, isNew: true });
    });

    // Get current logged-in user profile
    app.get('/users/me', verifyToken, async (req, res) => {
      const email = req.decoded.email;
      const user = await usersCollection.findOne({ email });
      if (!user) {
        return res.status(404).send({ message: 'User not found' });
      }
      const { password, ...userInfo } = user;
      res.send(userInfo);
    });

    // Get all users (Admin only)
    app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    // Delete User (Admin only)
    app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const result = await usersCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    // Update User Role (Admin only)
    app.patch('/users/role/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const { role } = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: { role: role }
      };
      
      // If we are changing role, adjust credits standard baseline if they were empty
      const user = await usersCollection.findOne(filter);
      if (user && user.credits === 0) {
        let newCredits = 0;
        if (role === 'Supporter') newCredits = 50;
        if (role === 'Creator') newCredits = 20;
        updateDoc.$set.credits = newCredits;
      }

      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });


    // --- CAMPAIGNS API ---

    // Create Campaign (Creator only)
    app.post('/campaigns', verifyToken, verifyCreator, async (req, res) => {
      const campaign = req.body;
      
      const newCampaign = {
        title: campaign.title,
        story: campaign.campaign_story,
        category: campaign.category,
        funding_goal: Number(campaign.funding_goal),
        minimum_contribution: Number(campaign.minimum_contribution),
        deadline: new Date(campaign.deadline),
        reward_info: campaign.reward_info,
        image_url: campaign.campaign_image_url,
        creator_email: req.decoded.email,
        creator_name: campaign.creator_name || req.decoded.name || 'Creator',
        amount_raised: 0,
        status: 'pending',
        createdAt: new Date()
      };

      const result = await campaignsCollection.insertOne(newCampaign);
      res.send(result);
    });

    // Get Campaigns (Public exploration + query filters)
    app.get('/campaigns', async (req, res) => {
      const { status, creator, search, category } = req.query;
      let query = {};
      
      if (status) {
        query.status = status;
      }
      if (creator) {
        query.creator_email = creator;
      }
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { category: { $regex: search, $options: 'i' } }
        ];
      }
      if (category && category !== 'All') {
        query.category = category;
      }

      let sort = { createdAt: -1 };
      if (creator) {
        sort = { deadline: -1 }; // Creators see in descending order based on deadline
      }

      const result = await campaignsCollection.find(query).sort(sort).toArray();
      res.send(result);
    });

    // Get specific campaign details
    app.get('/campaigns/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await campaignsCollection.findOne(query);
      res.send(result);
    });

    // Update Campaign (Creator only)
    app.patch('/campaigns/:id', verifyToken, verifyCreator, async (req, res) => {
      const id = req.params.id;
      const { title, campaign_story, reward_info } = req.body;
      const filter = { _id: new ObjectId(id), creator_email: req.decoded.email };
      
      const updateDoc = {
        $set: {
          title,
          story: campaign_story,
          reward_info
        }
      };

      const result = await campaignsCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // Delete Campaign (Creator / Admin)
    app.delete('/campaigns/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const email = req.decoded.email;
      const role = req.decoded.role;

      const campaign = await campaignsCollection.findOne({ _id: new ObjectId(id) });
      if (!campaign) {
        return res.status(404).send({ message: 'Campaign not found' });
      }

      // Allow admin or creator to delete
      if (role !== 'Admin' && campaign.creator_email !== email) {
        return res.status(403).send({ message: 'Forbidden: You cannot delete this campaign' });
      }

      // Refund all approved supporters of this campaign
      const approvedContributions = await contributionsCollection.find({
        campaign_id: id,
        status: 'approved'
      }).toArray();

      for (const contribution of approvedContributions) {
        // refund supporter credits
        await usersCollection.updateOne(
          { email: contribution.supporter_email },
          { $inc: { credits: contribution.contribution_amount } }
        );

        // send notification
        await notificationsCollection.insertOne({
          message: `The campaign "${campaign.title}" was deleted. Your contribution of ${contribution.contribution_amount} credits has been refunded.`,
          toEmail: contribution.supporter_email,
          actionRoute: "/dashboard/supporter-home",
          time: new Date(),
          read: false
        });
      }

      // Delete contributions associated with it
      await contributionsCollection.deleteMany({ campaign_id: id });
      
      // Delete reports associated with it
      await reportsCollection.deleteMany({ campaign_id: new ObjectId(id) });

      // Delete the campaign
      const result = await campaignsCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    // Approve/Reject Campaign (Admin only)
    app.patch('/campaigns/status/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const { status } = req.body; // 'approved' or 'rejected'

      const campaign = await campaignsCollection.findOne({ _id: new ObjectId(id) });
      if (!campaign) {
        return res.status(404).send({ message: 'Campaign not found' });
      }

      const result = await campaignsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { status: status } }
      );

      // Notify creator
      await notificationsCollection.insertOne({
        message: `Your campaign "${campaign.title}" has been ${status} by Admin.`,
        toEmail: campaign.creator_email,
        actionRoute: "/dashboard/my-campaigns",
        time: new Date(),
        read: false
      });

      res.send(result);
    });


    // --- CONTRIBUTIONS API ---

    // Create a new Contribution (Supporter only)
    app.post('/contributions', verifyToken, verifySupporter, async (req, res) => {
      const contribution = req.body;
      const supporterEmail = req.decoded.email;
      const amount = Number(contribution.contribution_amount);

      const user = await usersCollection.findOne({ email: supporterEmail });
      if (user.credits < amount) {
        return res.status(400).send({ message: 'Insufficient credits. Please purchase more credits.' });
      }

      // Deduct credits from supporter immediately
      await usersCollection.updateOne(
        { email: supporterEmail },
        { $inc: { credits: -amount } }
      );

      const newContribution = {
        campaign_id: contribution.campaign_id,
        campaign_title: contribution.campaign_title,
        contribution_amount: amount,
        supporter_email: supporterEmail,
        supporter_name: user.name,
        creator_name: contribution.creator_name,
        creator_email: contribution.creator_email,
        status: 'pending',
        date: new Date()
      };

      const result = await contributionsCollection.insertOne(newContribution);

      // Notify Creator of new pending contribution
      await notificationsCollection.insertOne({
        message: `${user.name} contributed ${amount} credits to your campaign "${contribution.campaign_title}" (pending approval).`,
        toEmail: contribution.creator_email,
        actionRoute: "/dashboard/creator-home",
        time: new Date(),
        read: false
      });

      res.send(result);
    });

    // Get Contributions logs (includes page pagination)
    app.get('/contributions', verifyToken, async (req, res) => {
      const { supporter_email, creator_email, status, page, limit } = req.query;
      let query = {};
      const email = req.decoded.email;
      const role = req.decoded.role;

      if (supporter_email) {
        if (role !== 'Admin' && supporter_email !== email) {
          return res.status(403).send({ message: 'Forbidden' });
        }
        query.supporter_email = supporter_email;
      }
      
      if (creator_email) {
        if (role !== 'Admin' && creator_email !== email) {
          return res.status(403).send({ message: 'Forbidden' });
        }
        query.creator_email = creator_email;
      }

      if (status) {
        query.status = status;
      }

      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 10;
      const skip = (pageNum - 1) * limitNum;

      const total = await contributionsCollection.countDocuments(query);
      const data = await contributionsCollection.find(query)
        .sort({ date: -1 })
        .skip(skip)
        .limit(limitNum)
        .toArray();

      res.send({ total, data, page: pageNum, limit: limitNum });
    });

    // Creator processes Contribution (Approve/Reject)
    app.patch('/contributions/status/:id', verifyToken, verifyCreator, async (req, res) => {
      const id = req.params.id;
      const { action } = req.body; // 'approve' or 'reject'
      const creatorEmail = req.decoded.email;

      const contribution = await contributionsCollection.findOne({ _id: new ObjectId(id) });
      if (!contribution) {
        return res.status(404).send({ message: 'Contribution not found' });
      }

      if (contribution.creator_email !== creatorEmail) {
        return res.status(403).send({ message: 'Forbidden: You do not own this campaign' });
      }

      if (contribution.status !== 'pending') {
        return res.status(400).send({ message: 'Contribution already processed' });
      }

      if (action === 'approve') {
        // Change status to approved
        await contributionsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { status: 'approved' } }
        );

        // Update campaign raised credits
        await campaignsCollection.updateOne(
          { _id: new ObjectId(contribution.campaign_id) },
          { $inc: { amount_raised: contribution.contribution_amount } }
        );

        // Increase creator's raised_credits (earnings)
        await usersCollection.updateOne(
          { email: creatorEmail },
          { $inc: { raised_credits: contribution.contribution_amount } }
        );

        // Notify Supporter
        await notificationsCollection.insertOne({
          message: `Your Contribution of ${contribution.contribution_amount} credits to ${contribution.campaign_title} was approved by ${contribution.creator_name}`,
          toEmail: contribution.supporter_email,
          actionRoute: "/dashboard/supporter-home",
          time: new Date(),
          read: false
        });

        res.send({ message: 'Contribution approved' });
      } 
      else if (action === 'reject') {
        // Change status to rejected
        await contributionsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { status: 'rejected' } }
        );

        // Refund the contribution amount back to the supporter's credits
        await usersCollection.updateOne(
          { email: contribution.supporter_email },
          { $inc: { credits: contribution.contribution_amount } }
        );

        // Notify Supporter
        await notificationsCollection.insertOne({
          message: `Your Contribution of ${contribution.contribution_amount} credits to ${contribution.campaign_title} was rejected by ${contribution.creator_name}. Credits refunded.`,
          toEmail: contribution.supporter_email,
          actionRoute: "/dashboard/supporter-home",
          time: new Date(),
          read: false
        });

        res.send({ message: 'Contribution rejected & refunded' });
      } 
      else {
        res.status(400).send({ message: 'Invalid action' });
      }
    });


    // --- WITHDRAWALS API ---

    // Create Withdrawal Request (Creator only)
    app.post('/withdrawals', verifyToken, verifyCreator, async (req, res) => {
      const { credits, payment_system, account_number } = req.body;
      const creatorEmail = req.decoded.email;
      const withdrawalCredit = Number(credits);

      if (withdrawalCredit < 200) {
        return res.status(400).send({ message: 'Minimum withdrawal is 200 credits ($10)' });
      }

      const user = await usersCollection.findOne({ email: creatorEmail });
      if (user.raised_credits < withdrawalCredit) {
        return res.status(400).send({ message: 'Insufficient raised credits to withdraw' });
      }

      const withdrawalAmount = withdrawalCredit / 20; // 20 Credits = 1 Dollar

      const newWithdrawal = {
        creator_email: creatorEmail,
        creator_name: user.name,
        withdrawal_credit: withdrawalCredit,
        withdrawal_amount: withdrawalAmount,
        payment_system,
        account_number,
        status: 'pending',
        date: new Date()
      };

      const result = await withdrawalsCollection.insertOne(newWithdrawal);
      res.send(result);
    });

    // Get withdrawals list (Creator / Admin)
    app.get('/withdrawals', verifyToken, async (req, res) => {
      const email = req.decoded.email;
      const role = req.decoded.role;
      const { creator } = req.query;

      let query = {};
      if (role === 'Creator' || creator) {
        query.creator_email = email;
      }

      const result = await withdrawalsCollection.find(query).sort({ date: -1 }).toArray();
      res.send(result);
    });

    // Approve Withdrawal Request (Admin only)
    app.patch('/withdrawals/status/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const withdrawal = await withdrawalsCollection.findOne({ _id: new ObjectId(id) });

      if (!withdrawal) {
        return res.status(404).send({ message: 'Withdrawal request not found' });
      }

      if (withdrawal.status !== 'pending') {
        return res.status(400).send({ message: 'Withdrawal already processed' });
      }

      const creator = await usersCollection.findOne({ email: withdrawal.creator_email });
      if (creator.raised_credits < withdrawal.withdrawal_credit) {
        return res.status(400).send({ message: 'Creator has insufficient raised credits now' });
      }

      // Deduct creator's raised credits
      await usersCollection.updateOne(
        { email: withdrawal.creator_email },
        { $inc: { raised_credits: -withdrawal.withdrawal_credit } }
      );

      // Change status to approved
      const result = await withdrawalsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { status: 'approved' } }
      );

      // Notify creator
      await notificationsCollection.insertOne({
        message: `Your withdrawal request of $${withdrawal.withdrawal_amount} (${withdrawal.withdrawal_credit} credits) was approved by Admin.`,
        toEmail: withdrawal.creator_email,
        actionRoute: "/dashboard/withdrawals",
        time: new Date(),
        read: false
      });

      res.send(result);
    });


    // --- STRIPE & PAYMENTS API ---

    // Stripe checkout intent
    app.post('/create-payment-intent', verifyToken, verifySupporter, async (req, res) => {
      const { price } = req.body;
      const amountInCents = Math.round(Number(price) * 100);

      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amountInCents,
          currency: 'usd',
          payment_method_types: ['card']
        });
        res.send({ clientSecret: paymentIntent.client_secret });
      } catch (err) {
        res.status(500).send({ error: err.message });
      }
    });

    // Store Payment & Top Up Credits
    app.post('/payments', verifyToken, verifySupporter, async (req, res) => {
      const payment = req.body; // { credits, price, paymentIntentId }
      const email = req.decoded.email;

      const user = await usersCollection.findOne({ email });
      if (!user) {
        return res.status(404).send({ message: 'User not found' });
      }

      const paymentRecord = {
        supporter_email: email,
        supporter_name: user.name,
        amount: Number(payment.price),
        credits: Number(payment.credits),
        payment_intent_id: payment.paymentIntentId || 'dummy_intent_id_' + Date.now(),
        date: new Date()
      };

      const result = await paymentsCollection.insertOne(paymentRecord);

      // Top up Supporter credits
      await usersCollection.updateOne(
        { email },
        { $inc: { credits: Number(payment.credits) } }
      );

      // Notify supporter
      await notificationsCollection.insertOne({
        message: `Successfully purchased ${payment.credits} credits for $${payment.price}.`,
        toEmail: email,
        actionRoute: "/dashboard/supporter-home",
        time: new Date(),
        read: false
      });

      res.send(result);
    });

    // Get Payment History
    app.get('/payments', verifyToken, async (req, res) => {
      const email = req.decoded.email;
      const role = req.decoded.role;
      const { supporter } = req.query;

      let query = {};
      if (role === 'Supporter' || supporter) {
        query.supporter_email = email;
      }

      const result = await paymentsCollection.find(query).sort({ date: -1 }).toArray();
      res.send(result);
    });


    // --- NOTIFICATIONS API ---

    app.get('/notifications', verifyToken, async (req, res) => {
      const email = req.decoded.email;
      const result = await notificationsCollection.find({ toEmail: email }).sort({ time: -1 }).toArray();
      res.send(result);
    });

    app.patch('/notifications/read/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const result = await notificationsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { read: true } }
      );
      res.send(result);
    });


    // --- REPORTS API ---

    // Submit Fraud/Fraudulent report
    app.post('/reports', verifyToken, verifySupporter, async (req, res) => {
      const { campaign_id, campaign_title, reason } = req.body;
      const email = req.decoded.email;
      const user = await usersCollection.findOne({ email });

      const newReport = {
        campaign_id: new ObjectId(campaign_id),
        campaign_title,
        reporter_name: user.name,
        reporter_email: email,
        reason,
        date: new Date()
      };

      const result = await reportsCollection.insertOne(newReport);
      res.send(result);
    });

    // Get all reports (Admin only)
    app.get('/reports', verifyToken, verifyAdmin, async (req, res) => {
      const result = await reportsCollection.find().sort({ date: -1 }).toArray();
      res.send(result);
    });

    // Delete a report (Admin only)
    app.delete('/reports/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const result = await reportsCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });


    // --- DASHBOARD/STATS API ---

    app.get('/stats', verifyToken, async (req, res) => {
      const email = req.decoded.email;
      const role = req.decoded.role;

      if (role === 'Supporter') {
        const totalContributions = await contributionsCollection.countDocuments({ supporter_email: email });
        const pendingContributions = await contributionsCollection.countDocuments({ supporter_email: email, status: 'pending' });
        
        const approvedContributionsList = await contributionsCollection.find({ supporter_email: email, status: 'approved' }).toArray();
        let totalAmountContributed = 0;
        approvedContributionsList.forEach(c => {
          totalAmountContributed += c.contribution_amount;
        });

        return res.send({
          totalContributions,
          pendingContributions,
          totalAmountContributed
        });
      } 
      else if (role === 'Creator') {
        const totalCampaigns = await campaignsCollection.countDocuments({ creator_email: email });
        const activeCampaigns = await campaignsCollection.countDocuments({
          creator_email: email,
          deadline: { $gt: new Date() }
        });

        const creatorCampaigns = await campaignsCollection.find({ creator_email: email }).toArray();
        let totalAmountRaised = 0;
        creatorCampaigns.forEach(c => {
          totalAmountRaised += c.amount_raised || 0;
        });

        return res.send({
          totalCampaigns,
          activeCampaigns,
          totalAmountRaised
        });
      } 
      else if (role === 'Admin') {
        const totalSupporters = await usersCollection.countDocuments({ role: 'Supporter' });
        const totalCreators = await usersCollection.countDocuments({ role: 'Creator' });

        const allUsers = await usersCollection.find().toArray();
        let totalAvailableCredits = 0;
        allUsers.forEach(u => {
          totalAvailableCredits += u.credits || 0;
        });

        const allPayments = await paymentsCollection.find().toArray();
        let totalPaymentsProcessed = 0;
        allPayments.forEach(p => {
          totalPaymentsProcessed += p.amount || 0;
        });

        return res.send({
          totalSupporters,
          totalCreators,
          totalAvailableCredits,
          totalPaymentsProcessed
        });
      }

      res.status(400).send({ message: 'Invalid role' });
    });

  } catch (err) {
    console.error("Failed to connect or set up database:", err);
  }
}
run().catch(console.dir);

// Root Endpoint
app.get('/', (req, res) => {
  res.send('Crowdfunding Platform Server is running...');
});

// Start Server
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
