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
        db = client.db("JPJeQDB"); 
    } catch (err) {
        console.error("Error:", err);
    }
}
connectToMongoDB();

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

// Use Case: Customer Registration
// Endpoint: /customers/register
// Method: POST
// Status Codes: 201 Created, 400 Bad Request
app.post('/customers/register', async (req, res) => {
    try {
        const { username, password, idnumber } = req.body;
        const result = await db.collection('customers').insertOne({ username, password, idnumber });
        res.status(201).json({ id: result.insertedId });
    } catch (err) {
        res.status(400).json({ error: "Invalid user data" });
    }
});

// Use Case: Customer Login
// Endpoint: /customers/login
// Method: POST
// Status Codes: 200 OK, 401 Unauthorized
app.post('/customers/login', async (req, res) => {
    try {
        const { idnumber, password } = req.body;
        const customer = await db.collection('customers').findOne({ idnumber, password });
        res.status(200).json({ customerId: customer._id });
    } catch (err) {
        res.status(400).json({ error: "Invalid customer data" });
    }
});

// Use Case: Obtain queueing number
// Endpoint: /queue/obtain/:customerId
// Method: POST (as it's creating a new queue entry)
// Status Codes: 201 Created, 503 Service Unavailable (if queue system is down or full)
app.post('/queue/obtain/:customerId', async (req, res) => {
    try {
        const { customerId } = req.params;
        if (!ObjectId.isValid(customerId)) {
            return res.status(400).json({ error: "Invalid customer ID" });
        }

        const customer = await db.collection('customers').findOne({ _id: new ObjectId(customerId) });
        if (!customer) {
            return res.status(400).json({ error: "Customer not found" });
        }

        const nextQueueNumber = await getNextQueueNumber(); // Placeholder function
        const result = await db.collection('queue').insertOne({ customerId: new ObjectId(customerId), number: nextQueueNumber, timestamp: new Date() });
        res.status(201).json({ queueNumber: nextQueueNumber });
    } catch (err) {
        console.error("Error obtaining queue number:", err);
        res.status(503).json({ error: "Failed to obtain queue number" });
    }
});

async function getNextQueueNumber() {
    // In a real system, this would involve atomic operations to ensure unique numbers
    const lastQueueEntry = await db.collection('queue').find().sort({ number: -1 }).limit(1).toArray();
    if (lastQueueEntry.length > 0) {
        return lastQueueEntry[0].number + 1;
    }
    return 1;
}

// Use Case: Update Queueing Number
// Endpoint: /staff/queue/next
// Method: PATCH
// Status Codes: 200 OK, 404 Not Found
app.patch('/staff/queue/next', async (req, res) => {
    try {
        const nextInQueue = await db.collection('queue').findOne({ served: { $ne: true } }, { sort: { number: 1 } });
        if (nextInQueue) {
            await db.collection('queue').updateOne({ _id: nextInQueue._id }, { $set: { served: true, servedAt: new Date() } });
            res.status(200).json({ message: `Calling queue number ${nextInQueue.number}` });
        } else {
            res.status(404).json({ message: "Queue is empty" });
        }
    } catch (err) {
        console.error("Error updating queue:", err);
        res.status(500).json({ error: "Failed to update queue" });
    }
});

// Use Case: Cancel Queue Entry
// Endpoint: /staff/queue/cancel/:queueNumber
// Method: DELETE
app.delete('/staff/queue/cancel/:queueNumber', async (req, res) => {
    try {
        const { queueNumber } = req.params;
        const result = await db.collection('queue').deleteOne({ number: parseInt(queueNumber) });
        if (result.deletedCount > 0) {
            res.status(204).send();
        } else {
            res.status(404).json({ error: `Queue number ${queueNumber} not found` });
        }
    } catch (err) {
        console.error("Error cancelling queue entry:", err);
        res.status(400).json({ error: "Invalid queue number" });
    }
});

// Use Case: Manages customer accounts
// Endpoint: /admin/customers
// Method: GET
// Status Codes: 200 OK
app.get('/admin/customers', async (req, res) => {
    try {
        const customers = await db.collection('customers').find({}, { projection: { password: 0 } }).toArray();
        res.status(200).json(customers);
    } catch (err) {
        console.error("Error fetching customers:", err);
        res.status(500).json({ error: "Failed to fetch customer accounts" });
    }
});

// Endpoint: /admin/customers/:id
// Method: DELETE
// Status Codes: 204 No Content, 404 Not Found, 403 Forbidden (if not admin)
app.delete('/admin/customers/:id', async (req, res) => {
    // In a real application, you'd need to implement authentication and authorization
    // to ensure only admins can perform this action.
    try {
        const customerId = req.params.id;
        const result = await db.collection('customers').deleteOne({ _id: new ObjectId(customerId) });

        if (result.deletedCount > 0) {
            res.status(204).send();
        } else {
            res.status(404).json({ error: "Customer not found" });
        }
    } catch (err) {
        console.error("Error deleting customer:", err);
        res.status(400).json({ error: "Invalid customer ID" });
    }
});

// Use Case: Generates system-wide reports (Admin)
// Endpoint: /admin/analytics
// Method: GET
app.get('/admin/reports', async (req, res) => {
    try {
        const totalCustomers = await db.collection('customers').countDocuments();
        const queueLength = await db.collection('queue').countDocuments();

        res.status(200).json({ totalCustomers, currentQueueLength: queueLength });
    } catch (err) {
        res.status(500).json({ error: "Failed to generate system reports" });
    }
});