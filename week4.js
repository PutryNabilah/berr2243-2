const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const port = 3000;

const app = express();
app.use(express.json());

let db;

async function connectToMongoDB() {
    const uri = "mongodb://localhost:27017";
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log("Connected to MongoDB!");
        db = client.db("testdb"); 
    } catch (err) {
        console.error("Error:", err);
    }
}
connectToMongoDB();

app.listen(port, () => {
    console.log('Server running on port ${port}');
});

app.post('/users', async (req, res) => {
    try {
        const { username, password, email } = req.body;
        const result = await db.collection('users').insertOne({ username, password, email });
        res.status(201).json({ id: result.insertedId });
    } catch (err) {
        res.status(400).json({ error: "Invalid user data" });
    }
});

app.post('/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await db.collection('users').findOne({ username, password });
        res.status(200).json({ userId: user._id });
    } catch (err) {
        res.status(401).json({ error: "Invalid user data" });
    }
});

app.get('/users/:id/profile', async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
        if (user) {
            // Exclude sensitive information like password before sending the profile
            const { password, ...profile } = user;
            res.status(200).json(profile);
        } else {
            res.status(404).json({ error: "Not Found: User not found" });
        }
    } catch (err) {
        res.status(400).json({ error: "Bad Request: Invalid user ID" });
    }
});

app.get('/rides', async (req, res) => {
    try {
        const rides = await db.collection('rides').find().toArray();
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch rides"});
    }
});

app.post('/rides', async (req, res) => {
    try {
        const result = await db.collection('rides').insertOne(req.body);
        res.status(201).json({ id: result.insertedId });
    }  catch  (err) {
        res.status(400).json({ error: "Invalid ride data"});
    }
});

app.patch('/rides/:id', async (req, res) => {
    try {
        const result = await db.collection('rides').updateOne(
            {_id: new ObjectId (req.params.id) },
            { $set: { status: req.body.status } }
        );

    if (result.modifiedCount === 0) {
        return res.status(404).json({ error: "Ride not found" });
    }  
    res.status(200).json ({ update: result.modifiedCount });

    } catch (err) {
        // Handle invalid ID format or DB errors
        res.status(400).json({ error: "Invalid ride ID or data" });
    }
});

app.delete('/rides/:id', async (req, res) => {
    try {
        const result = await db.collection('rides').deleteOne(
            {_id: new ObjectId(req.params.id) }
        );

        if (result.deleteCount === 0) {
            return res.status(404).json({ error: "Ride not found" });
        }
        res.status(200).json({ deleted: result.deleteCount });

    } catch (err) {
        res.status(400).json({ error: "Invalid"});
    }
});

app.post('/drivers', async (req, res) => {
    try {
        const { username, password, email } = req.body;
        const result = await db.collection('drivers').insertOne({ username, password, email });
        res.status(201).json({ id: result.insertedId });
    } catch (err) {
        res.status(400).json({ error: "Invalid driver data" });
    }
});

app.patch('/drivers/:id/status', async (req, res) => {
    try {
        const driverId = req.params.id;
        const { status } = req.body;
        if (!status) {
            return res.status(400).json({ error: "Bad Request: Missing status in request body" });
        }
        const result = await db.collection('drivers').updateOne(
            { _id: new ObjectId(driverId) },
            { $set: { status } }
        );
        if (result.modifiedCount > 0) {
            res.status(200).json({ updated: result.modifiedCount });
        } else {
            res.status(404).json({ error: "Driver not found" });
        }
    } catch (err) {
        res.status(400).json({ error: "Invalid driver ID or data" });
    }
});

app.get('/drivers/:id/earnings', async (req, res) => {
    try {
        const driverId = req.params.id;
        const driver = await db.collection('drivers').findOne({ _id: new ObjectId(driverId) }, { projection: { earnings: 1 } });
        if (driver) {
            res.status(200).json({ earnings: driver.earnings || 0 });
        } else {
            res.status(404).json({ error: "Driver not found" });
        }
    } catch (err) {
        res.status(400).json({ error: "Invalid driver ID" });
    }
});

app.delete('/admin/users/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const result = await db.collection('users').deleteOne({ _id: new ObjectId(userId) });

        if (result.deletedCount > 0) {
            res.status(204).send(); 
        } else {
            res.status(404).json({ error: "User not found" });
        }
    } catch (err) {
        res.status(403).json({ error: "Forbidden" });
    }
});

app.get('/admin/analytics', async (req, res) => {
    try {
        const totalUsers = await db.collection('users').countDocuments();
        const totalDrivers = await db.collection('drivers').countDocuments();
        const totalRides = await db.collection('rides').countDocuments();

        res.status(200).json({ totalUsers, totalDrivers, totalRides });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch system analytics" });
    }
});