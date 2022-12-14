const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

//middle wares
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.yjnxy2v.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next){
    const authHeader = req.headers.authorization;
    if(!authHeader){
        return res.status(401).send('unauthorized access');
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN, function(err, decoded){
        if(err){
            return res.status(403).send({message: 'forbidden access'});
        }
        req.decoded = decoded;
        next();
    });

}

async function run (){
    try{
        const categoryCollection = client.db('resellProduct').collection('categories');
        const productCollection = client.db('resellProduct').collection('products');
        const bookingsCollection = client.db('resellProduct').collection('bookings');
        const usersCollection = client.db('resellProduct').collection('users');

        //for showing category
        app.get('/categories', async (req, res) => {
            const query = {};
            const cursor = categoryCollection.find(query);
            const categories = await cursor.toArray();
            res.send(categories);
        });

        //category wise products api for showing products
        app.get('/products/:id', async (req, res) => {
            const id = req.params.id;
            let query = {categoryId: id};
            const products = await productCollection.find(query).toArray();

            let allUsers = await usersCollection.find({}).toArray();
           
            
                let newData = products.map(product => {
                    allUsers.map(user => {
                        if (user.email == product.email) {
                            product["verified"] = user?.verified;
                        }
                    })
                    return product;
                })
                console.log(newData)
                res.send(newData);



            // res.send(products);
        });

        

        //posting bookings in db
        app.post('/bookings', async(req, res) =>{
            const booking = req.body;
            const result = await bookingsCollection.insertOne(booking);
            res.send(result);
        });

        //for showing bookings/orders based on users email
        app.get('/bookings', verifyJWT, async (req, res) => {
            let query = {};
            if (req.query.email) {
                query = {
                    email: req.query.email
                }
            }
            const bookings = await bookingsCollection.find(query).toArray();
            res.send(bookings);
        });

        //getting booking info
        app.get('/bookings', verifyJWT, async(req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;
            if(email !== decodedEmail){
                return res.status(403).send({message: 'forbidden access'});
            }
            const query = {email: email};
            const bookings = await bookingsCollection.find(query).toArray();
            res.send(bookings);
        });

        //verifying jwt
        app.get('/jwt', async(req, res) =>{
            const email = req.query.email;
            const query = {email: email};
            const user = await usersCollection.findOne(query);
            if(user){
                const token = jwt.sign({email}, process.env.ACCESS_TOKEN, {expiresIn: '1h'});
                return res.send({accessToken: token});
            }
            res.status(403).send({accessToken: ''});
        });

        //for all user
        app.get('/users', async(req, res) =>{
            const query = {};
            const users = await usersCollection.find(query).toArray();
            res.send(users);
        });


        //checking admin
        app.get('/users/admin/:email', verifyJWT, async(req, res) =>{
            const email = req.params.email;
            const query = {email};
            const user = await usersCollection.findOne(query);
            res.send({isAdmin: user?.role === 'admin'});
        })

        //for posting all users info
        app.post('/users', async(req, res) =>{
            const user = req.body;
            user['verified'] = 'No';
            const result = await usersCollection.insertOne(user);
            res.send(result);
        });

        //for making admin
        app.put('/users/admin/:id', verifyJWT,  async(req, res) =>{
            const decodedEmail = req.decoded.email;
            const query = {email: decodedEmail};
            const user = await usersCollection.findOne(query);
            if(user?.role !== 'admin'){
                return res.status(403).send({message: 'forbidden access'});
            }
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true};
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        });

        // -------------------------
        app.get('/getusertype', verifyJWT, async (req, res) =>{
            const email = req.query.email;
            const query = { email : email};
            const result = await usersCollection.findOne(query);
            res.send(result);

        });

        //for getting all seller info
        app.get('/allsellers', verifyJWT, async (req, res) =>{  
            const query = { userType : 'seller'};
            const result = await usersCollection.find(query).toArray();
            res.send(result);

        });

        //for getting all buyer info
        app.get('/allbuyers', verifyJWT, async (req, res) =>{  
            const query = { userType : 'buyer'};
            const result = await usersCollection.find(query).toArray();
            res.send(result);

        });

        app.put('/makeverified/:id', verifyJWT, async (req, res) =>{
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    verified: 'Yes'
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        });

        app.delete('/userdelete/:id', verifyJWT, async (req, res) =>{
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const result = await usersCollection.deleteOne(query);
            res.send(result);
        });

        //add product
        app.post('/dashboard/addproduct', async (req, res) => {
            const product = req.body;
            const result = await productCollection.insertOne(product);
            res.send(result);
        });

        app.get('/addproducts/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            let query = { email: email };
            const products = await productCollection.find(query).toArray();
            res.send(products);
        });
        
        //for showing my product based on users email
        app.get('/dashboard/myproducts', verifyJWT, async (req, res) => {
            let query = {};
            if (req.query.email) {
                query = {
                    email: req.query.email
                }
            }
            const myProducts = await productCollection.find(query).toArray();
            res.send(myProducts);
        });

        //delete product
        app.delete('/dashboard/myproduct/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await productCollection.deleteOne(query);
            res.send(result);
        });

    }
    finally{

    }
}

run().catch(err => console.error(err));


app.get('/', (req, res) => {
    res.send('Resell product server is running');
});

app.listen(port, () => {
    console.log(`Resell product server is running on: ${port}`);
});