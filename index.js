const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

//middle wares
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.yjnxy2v.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run (){
    try{
        const categoryCollection = client.db('resellProduct').collection('categories');
        const productCollection = client.db('resellProduct').collection('products');
        const bookingsCollection = client.db('resellProduct').collection('bookings');

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
            let query = {category_id: id};
            const products = await productCollection.find(query).toArray();
            res.send(products);
        });

        //posting bookings in db
        app.post('/bookings', async(req, res) =>{
            const booking = req.body;
            console.log(booking);
            const result = await bookingsCollection.insertOne(booking);
            res.send(result);
        })

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