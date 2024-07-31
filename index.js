const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient()

const express = require('express');
const app = express();

app.use(express.urlencoded({ extended: true   
}));


app.post('/', async (req, res) => {
    if (req.body.first_name == null) {
        res.send({
            code: "MISSING_FIELD_REQURED",
            message: "The 'first_name' field is required."
        })
    }

    if (req.body.email_address == null) {
        res.send({
            code: "MISSING_FIELD_REQURED",
            message: "The 'email_address' field is required."
        })
    }

    try {
        await prisma.userInfo.create({
            data: {
                first_name: req.body.first_name,
                last_name: req.body.last_name,
                email_address: req.body.email_address,
            }
        })
    } catch (err) {
        if (err.code == "P2002") {
            res.send({
                code: "409 Conflict",
                message: "The user with the email address: " + req.body.email_address + " already exists."
            })
        }
    }

    // res.send({
    //     code: "200 OK",
    //     message: "User created successfully."
    // })
});


app.listen(3000, () => {
    console.log("Server running on port 3000");
   });