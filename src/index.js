const express = require('express');
const http = require('http');
const path = require('path');

const Player = require('./models/player');
const Bullet = require('./models/bullet');

const PORT = 3000;
const app = express();
const server = http.createServer(app);

const { Server } = require('socket.io');
const io = new Server(server);

const TICK_RATE = 50;
const inputsMap = [];
const BULLET_SPEED = 5;
const gravity = 8;
//const bounce = .2;

var players = [];
var bullets = [];
var canvasSize = { x: 850, y: 600 };
var lastUpdate = Date.now();

app.get('/', (_req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

function isColliding(rect1, rect2) {
    return (
        rect1.x < rect2.x + rect2.attributes.size &&
        rect1.x + rect1.attributes.size > rect2.x &&
        rect1.y < rect2.y + rect2.attributes.size &&
        rect1.attributes.size + rect1.y > rect2.y
    );
}

function isCollidingWithPlayer(player) {
    const otherPlayers = players.filter((p) => p.id != player.id);

    for (let other of otherPlayers) {
        if (isColliding(player, other)) {
            return [true, other];
        }
    }
    return false;
}

function applyGravity(player) {
    const ground = canvasSize.y - player.attributes.size - 120;
    player.velY += gravity;
    player.y += player.velY;

    const isPlayerColling = isCollidingWithPlayer(player);
    if (isPlayerColling) {
        player.y = isPlayerColling[1].y - player.attributes.size;
        player.velY = 0;
        return true;
    }

    if (player.y >= ground) {
        player.y = ground;
        player.velY = 0;
        return true;
    }
    return false;
}

function killPlayer(player) {
    const socket = io.sockets.sockets.get(player.id);
    player.health = 0;
    player.isDead = true;

    const alivePlayers = players.filter((p) => !p.isDead);
    const endGame = alivePlayers.length <= 1;
    const winner = endGame ? alivePlayers[0] : null;

    if (endGame) {
        io.emit('end-game', winner, winner == null);
        setTimeout(() => {
            for (let player of players) {
                player.health = 100;
                player.x = 0,
                player.y = 0,
                player.velY = 0;
                player.isDead = false;
            }
        }, 5000);
    } else {
        socket.emit('game-over');
    }
}

async function tick(deltaTime) {
    const alivePlayers = players.filter((p) => !p.isDead);
    for (let player of alivePlayers) {
        const isGrounded = applyGravity(player);
        const inputs = inputsMap[player.id];

        if (inputs.up && isGrounded) {
            player.velY -= player.attributes.jumpForce;
        }
        if (inputs.left) {
            player.x -= player.attributes.speed;
        } else if (inputs.right) {
            player.x += player.attributes.speed;
        }

        if (player.x < 0) {
            player.x = 0;
        } else if (player.x > canvasSize.x - player.attributes.size) {
            player.x = canvasSize.x - player.attributes.size;
        }
        
        const isPlayerColling = isCollidingWithPlayer(player);
        if (isPlayerColling) {
            const otherPos = isPlayerColling[1].x;
            player.x = inputs.left ?
                otherPos + player.attributes.size :
                otherPos - player.attributes.size;
        }
        players[player.id] = player;
    }

    for (let bullet of bullets) {
        bullet.x += Math.cos(bullet.angle) * BULLET_SPEED;
        bullet.y += Math.sin(bullet.angle) * BULLET_SPEED;
        bullet.timeLeft -= deltaTime;

        for (let other of players.filter((p) => p.id != bullet.playerId)) {
            const distance = Math.sqrt(
                (other.x + other.attributes.size / 2 - bullet.x) ** 2 + 
                (other.y + other.attributes.size / 2 - bullet.y) ** 2
            );
            if (distance <= other.attributes.size / 2) {
                other.health -= 10;
                bullets = bullets.filter((b) => b != bullet);
                if (other.health <= 0 && !other.isDead) {
                    killPlayer(other);
                }
            }
        }
    }
    bullets = bullets.filter((b) => b.timeLeft > 0);
    io.emit('update', alivePlayers, bullets, {...canvasSize});
}

async function main() {
    io.on('connect', (socket) => {          
        console.log("Player conectado:", socket.id);
        socket.on('start-game', (username) => {
            inputsMap[socket.id] = { 
                up: false,
                down: false,
                left: false,
                right: false
            };
            players.push(new Player(socket.id, username, 25, 15, 45));
    
            socket.on('inputs', (inputs) => {
                inputsMap[socket.id] = inputs;
            });
            socket.on('bullet', (angle) => {
                let player = players.find((p) => p.id == socket.id);
                if (player && player.health > 0) {
                    bullets.push(new Bullet(player, null, angle));
                }
            });
            socket.on('disconnect', () => {
                players = players.filter(p => p.id != socket.id);
                delete inputsMap[socket.id];
            });
        });
    });

    setInterval(() => {
        const now = Date.now();
        const deltaTime = now - lastUpdate;

        tick(deltaTime);
        lastUpdate = now;
    }, 1000 / TICK_RATE);

    app.use(express.static('public'));
    server.listen(PORT, () => {
        console.log("Server online!");
    });
}

main();