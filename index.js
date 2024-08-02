const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient()

const express = require('express');
const app = express();
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const password = require('generate-password')

const timestamp = require('unix-timestamp');
timestamp.round = true;

app.use(express.urlencoded({ extended: true }));


app.post('/api/v1/createUser', async (req, res) => {
    if (req.body.first_name == null) {
        res.send({
            code: "MISSING_FIELD_REQURED",
            message: "The 'first_name' field is required."
        })
        return;
    }

    if (req.body.email_address == null) {
        res.send({
            code: "MISSING_FIELD_REQURED",
            message: "The 'email_address' field is required."
        })
        return;
    }

    if (req.body.password == null) {
        res.send({
            code: "MISSING_FIELD_REQURED",
            message: "The 'password' field is required."
        })
        return;
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(req.body.password, salt);

    try {
        let newUser = await prisma.userInfo.create({
            data: {
                first_name: req.body.first_name,
                last_name: req.body.last_name,
                email_address: req.body.email_address,
                password_hash: hash,
                salt: salt
            }
        })

        await prisma.refresh_token.create({
            data: {
                userId: newUser.id,
                refresh_token: password.generate({
                    numbers: true,
                    length: 95
                })
            }
        })
    } catch (err) {
        if (err.code == "P2002") {
            res.send({
                code: "409 Conflict",
                message: "The user with the email address: " + req.body.email_address + " already exists."
            })
            return;
        }
        console.log(err);
    }

    res.send({
        code: "200 OK",
        message: "User created successfully."
    })
});

app.get('/api/v1/getAccessToken', async (req, res) => {
    const {email_address, password} = req.body;
    const secret_key = process.env.SECRET_KEY;

    const userInfo = await prisma.userInfo.findUnique({
        where: {
            email_address: email_address,
        },
    })

    const hash = await bcrypt.hash(password, userInfo.salt);
    if (userInfo.password_hash === hash) {
        const token = jwt.sign({
            sub: process.env.ORG,
            userId: userInfo.id,
            iat: timestamp.now(),
            exp: timestamp.add(timestamp.now(), "+5m")
        }, secret_key)

        let refresh_token = await prisma.refresh_token.findFirst({
            where: {
                userId: userInfo.id
            },
            select: {
                refresh_token: true
            }
        })
        refresh_token = refresh_token.refresh_token

        res.send({token, refresh_token});
    } else {
        res.send({
            code: "401 UNAUTHORIZED",
            message: "Unauthorized access to resource."
        })
    }

});

app.get('/api/v1/getUserData', (req, res) => {
    const token = req.body.token;
    const secret_key = process.env.SECRET_KEY;

    let payload; 
    try {
        payload = jwt.verify(token, secret_key)
        if (payload.exp > timestamp.now()) {
            sendData();
        } else {
            res.send({
                code: "419 Access Token Expired",
                message: "Access token is expired. Regain access to resource by getting a new access token."
            })
        }
    } catch (err) {
        res.send({
            code: "401 UNAUTHORIZED",
            message: "Unauthorized access to resource."
        })
    }

    function sendData() {
        
    }
})

app.get('/api/v1/getNewToken', async (req, res) => {
    const token = req.body.token;
    const refresh_token = req.body.refresh_token;
    const secret_key = process.env.SECRET_KEY;
    
    const userInfo = await prisma.userInfo.findUnique({
        where: {
            id: jwt.decode(token).userId
        },
    })

    const dbRefresh = await prisma.refresh_token.findUnique({
        where: {
            userId: userInfo.id
        },
        select: {
            refresh_token: true
        }
    })

    let payload;
    try {
        payload = jwt.verify(token, secret_key)
        if (payload.exp > timestamp.now()) {
            res.send({token})
        }
    } catch (err) {
        if (err == "JsonWebTokenError: invalid signature") {
            res.send({
                code: "401 UNAUTHORIZED",
                message: "Unauthorized access to resource."
            })
        }

        if (err == "TokenExpiredError: jwt expired") {
            if (dbRefresh.refresh_token == refresh_token) {
                res.send({
                    token: jwt.sign({
                        sub: process.env.ORG,
                        userId: userInfo.id,
                        iat: timestamp.now(),
                        exp: timestamp.add(timestamp.now(), "+5m")
                    }, secret_key)
                })
            } else {
                res.send({
                    code: "401 UNAUTHORIZED",
                    message: "The provided refresh token is not valid."
                })
            }
        }
    }

})


app.listen(3000, () => {
    console.log("Server running on port 3000");
});
