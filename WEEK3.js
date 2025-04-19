

//GET /rides - Fetch all rides 
app.get('/rides', async (requ, res) => {
    try {
        const rides = await db.collection('rides').find().toArray();
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch rides"});
    }
});

// POST /rides - Create a new ride
app.post('/rides', async (requestAnimationFrame, res) => {
    try {
        const result = await db.collection('rides').insertOne(req.body);
        res.status(201).json({ id: result.insertedId });
    }  catch  (err) {
        res.status(400).json({ error: "Invalid ride data"});
    }
});

// PATCH /rides/:id - Update ride status 
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

// DELETE /rides/:id - Cancel a ride
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
