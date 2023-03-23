const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const jwt = require('jsonwebtoken');
require('dotenv').config();

const stripe = require("stripe")(process.env.STRIPE_SECRET);

const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qlqg855.mongodb.net/?retryWrites=true&w=majority`
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });



function verifyJWT(req, res, next) {
    

    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('Unauthorized Access');
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {

            return (res.status(403).send({ message: 'Forbidden access...' }))
        }
        req.decoded = decoded;
        next();
    })
}

async function run(){
    try {

        const usersCollections = client.db('Hero_Rider').collection('Users');
        const CoursesCollections = client.db('Hero_Rider').collection('Courses');
        const paymentCollections = client.db('Hero_Rider').collection('Payment');


        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            // console.log(email)
            const query = { userEmail: email }
            const user = await usersCollections.findOne(query);
            // console.log(user)
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '5h' })
                return res.send({ accessToken: token });
            }
            res.status(403).send({ accessToken: '' })
        })


        app.get('/users',verifyJWT,async (req, res) => {

            const decodedEmail = req.decoded.email;
            const queryverify = { userEmail: decodedEmail };
            const user = await usersCollections.findOne(queryverify);
            if (user?.userType !== 'Admin') {
                return res.status(403).send({ message: 'Forbidden Access' })
            }
            const query = {}
            const result = await usersCollections.find(query).toArray();
            res.send(result);
        })


        app.post('/users', async (req, res) => {

            
            const users = req.body;
            const result = await usersCollections.insertOne(users);
            res.send(result);
        });

        app.get('/users/:email', async (req, res) => {

           
            const email =req.params.email;
            // console.log(email)
            const query = { userEmail: email };
            const user = await usersCollections.findOne(query);
            res.send(user);

        })

        app.get('/users/Admin/:email', async (req, res) => {
            const email = req.params.email;
            // console.log(email)
            const query = { userEmail: email };
            const user = await usersCollections.findOne(query);
            // console.log(user)
            res.send({ isAdmin: user?.userType === 'Admin' });

        })

        app.get('/users/learner/:email', async (req, res) => {
            const email = req.params.email;
            // console.log(email)
            const query = { userEmail: email };
            const user = await usersCollections.findOne(query);
            // console.log(user)
            res.send({ isLearner: user?.userType === 'Learner' });

        })


        

        app.delete('/users/:id',verifyJWT, async (req, res) => {


            const decodedEmail = req.decoded.email;
            const query = { userEmail: decodedEmail };
            const user = await usersCollections.findOne(query);

            if (user?.userType !== 'Admin') {
                return res.status(403).send({ message: 'Forbidden Access' })
            }

            const id = req.params.id;
            // console.log(id)
            const filter = { _id: new ObjectId(id) };
            const result = await usersCollections.deleteOne(filter);
            res.send(result);
        })


        app.put('/users/:id',verifyJWT, async (req, res) => {
            const decodedEmail = req.decoded.email;
            const query = { userEmail: decodedEmail };
            const user = await usersCollections.findOne(query);

            if (user?.userType !== 'Admin') {
                return res.status(403).send({ message: 'Forbidden Access' })
            }


            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const options = { upsert: true }
            const updatedDoc = {
                $set: {
                    UserStatus: 'Block'
                }
            }
            const result = await usersCollections.updateOne(filter, updatedDoc, options);
            res.send(result);
        })

        app.put('/users/unblock/:id',verifyJWT, async (req, res) => {
            const decodedEmail = req.decoded.email;
            const query = { userEmail: decodedEmail };
            const user = await usersCollections.findOne(query);

            if (user?.userType !== 'Admin') {
                return res.status(403).send({ message: 'Forbidden Access' })
            }


            const id = req.params.id;
            // console.log(id)
            const filter = { _id: new ObjectId(id) }
            const options = { upsert: true }
            const updatedDoc = {
                $set: {
                    UserStatus: 'Unblock'
                }
            }
            const result = await usersCollections.updateOne(filter, updatedDoc, options);
            res.send(result);
        })


        app.get('/courses',async (req, res) => {

            const query = {}
            const result = await CoursesCollections.find(query).toArray();
            res.send(result);
        })

        app.get('/payment/:id', async (req, res) => {
            const id = req.params.id;
            // console.log(email)
            const filter = { _id: new ObjectId(id) }
            const user = await CoursesCollections.findOne(filter);
            // console.log(user)
            res.send(user);

        })





        app.post('/create-payment-intent', async(req,res)=>{
            const booking =req.body;
            const price = booking.price;
            const amount = price * 100;

            const paymentIntent = await stripe.paymentIntents.create({
                currency: 'usd',
                amount: amount,
                "payment_method_types": [
                    "card"
                ]
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        })


        app.post('/payment', async (req,res)=>{
            const payment = req.body;
            const result = await paymentCollections.insertOne(payment);
            res.send(result)
        })


        app.get('/course/enrolled/:email', async (req, res) => {
            const email = req.params.email;
            // console.log(email)
            const query = { email: email };
            const user = await  paymentCollections.findOne(query);
            res.send(user);

        })


     




    }
    finally {

    }
}

run().catch(console.log)



app.get('/', async(req , res)=>{
    res.send("Hero Rider Server is running...")
})

app.listen(port, ()=>console.log(`Hero Rider running on ${port}`))