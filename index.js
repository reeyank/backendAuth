const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient()

const express = require('express');
const cors = require('cors')
const app = express();
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const password = require('generate-password')
const http = require('http');
const WebSocket = require('ws');

app.use(cors());


const fs = require('fs')

const server = http.createServer(function(req, res) {
    fs.readFile('/Users/reeyank/Desktop/onGoingProjects/backendAuth/index.html', (err, data) => {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
      });
});

const wss = new WebSocket.Server({ server });

server.listen(5000);

wss.on('connection', (ws) => {
    ws.on('error', console.error);

    console.log('Client connected');
  
    ws.on('message', (message) => {
      console.log(`Received message: ${message}`);
  
      // Handle incoming message
    });
  
    ws.on('close', () => {
      console.log('Client disconnected');
    });
});

const Mailgun = require('mailgun-js');
const mailgun = new Mailgun({
    apiKey: process.env.EMAIL_API,
    domain: process.env.EMAIL_DOMAIN
})

const timestamp = require('unix-timestamp');
timestamp.round = true;

app.use(express.urlencoded({ extended: true }));

function genPass() {
    return password.generate({
        numbers: true,
        length: 95,
        uppercase: false
    });
}

app.post('/v1/createUser', async (req, res) => {
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

        let code = password.generate({
            length: 6,
            numbers: true
        })

        await prisma.refresh_token.create({
            data: {
                userId: newUser.id,
                refresh_token: genPass()
            }
        })

        var expireTime = new Date(timestamp.duration("+5m")).toISOString();

        if (process.env.EMAIL_VERIFICATION == true) {
            await prisma.email_verification.create({
                data: {
                    id: newUser.id,
                    code: code,
                    expireTimestamp: expireTime
                }
            })
        }

        var data = {
            from: "reeyan@fantasyfinance.email",
            to: req.body.email_address,
            subject: 'One time verification code from ' + process.env.ORG,
            text: 'The verification code is: ' + code + ". DO NOT SHARE THIS CODE WITH ANYONE. This code will be valid for 5 minutes."
            };
        
        mailgun.messages().send(data, function (err, body) {
            //If there is an error, render the error page
            if (err) {
                console.log(err);
            }
        });
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

app.get('/v1/getAccessToken', async (req, res) => {
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

app.get('/v1/getUserData', (req, res) => {
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

app.get('/v1/getNewToken', async (req, res) => {
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
                const newRefresh = genPass();

                try {
                    await prisma.refresh_token.update({
                        where: {
                            userId: userInfo.id
                        },
                        data: {
                            refresh_token: newRefresh
                        }
                    })
                } catch (err) {
                    console.log(err)
                }

                res.send({
                    token: jwt.sign({
                        sub: process.env.ORG,
                        userId: userInfo.id,
                        iat: timestamp.now(),
                        exp: timestamp.add(timestamp.now(), "+5m")
                    }, secret_key),
                    refresh_token: newRefresh
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

if (process.env.EMAIL_VERIFICATION == "TRUE") {
    app.post('/v1/verifyEmail', async (req, res) => {
        const code = req.body.code;
        const email_address = req.body.email_address;

        try {
            const user = await prisma.userInfo.findUnique({
                where: {
                    email_address: email_address
                }
            })

            const dbCode = await prisma.email_verification.findUnique({
                where: {
                    id: user.id
                }
            })

            if (dbCode.code == code) {
                if (dbCode.verified == true) {
                    res.status(402).send({
                        code: "404 ALREADY VERIFIED",
                        message: "The provided email address has already been verified."
                    })
                } else {
                    await prisma.email_verification.update({
                        where: {
                            id: user.id
                        },
                        data: {
                            verified: true
                        }
                    })
                    res.send({
                        code: "200 OK",
                        message: "The email address has been verified."
                    })
                }
            } else {
                res.send({
                    code: "400 WRONG CODE",
                    message: "The code provided is wrong. Please provide the correct code to verify the email address."
                })
            }
        } catch (err) {
            res.status(404).send({
                code: "404 INCOMPLETE INFO",
                message: "Please provide both the code and the email adress."
            })
            console.log(err)
        }
    })
}

app.listen(3000, () => {
    console.log("Server running on port 3000");
});