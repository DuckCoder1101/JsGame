const express = require('express'); // Bibliotecas do servidor
const http = require('http');

const path = require('path'); // Path

const { applyPhysics, isCollidingWithPlayer } = require('./models/physics'); // Classes e funções secundárias
const { Player, killPlayer } = require('./models/player');
const Bullet = require('./models/bullet');

const PORT = 3000; // Configuração do servidor
const app = express();
const server = http.createServer(app);

const { Server } = require('socket.io'); // Socket Io
const io = new Server(server);

const TICK_RATE = 50; // Contantes globais
const inputsMap = [];
const BULLET_SPEED = 5;
const gravity = 8;

var players = []; // Variáveis globais
var bullets = [];
var canvasSize = { x: 850, y: 600 };
var lastUpdate = Date.now();

// Rota padrão do servidor
app.get('/', (_req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Função chamada a cada atualização do servidor
async function tick(deltaTime) {
    const alivePlayers = players.filter((p) => !p.isDead); // Filtra os players vivos
    for (let player of alivePlayers) {
        const isGrounded = applyPhysics(player, gravity, canvasSize, players); // Aplica a física
        const inputs = inputsMap[player.id];

        // Move o player
        if (inputs.up && isGrounded) {
            player.velY -= player.attributes.jumpForce;
        }

        if (inputs.left) {
            player.x -= player.attributes.speed;
        } else if (inputs.right) {
            player.x += player.attributes.speed;
        }

        // Verifica os limites do canvas
        if (player.x < 0) {
            player.x = 0;
        } else if (player.x > canvasSize.x - player.attributes.size) {
            player.x = canvasSize.x - player.attributes.size;
        }
        
        // Verifica a colizão
        const isPlayerColling = isCollidingWithPlayer(player, players);
        if (isPlayerColling) {
            const otherPos = isPlayerColling[1].x;
            player.x = inputs.left ?
                otherPos + player.attributes.size :
                otherPos - player.attributes.size;
        }
        players[player.id] = player;
    }

    for (let bullet of bullets) {
        // Move os projéteis
        bullet.x += Math.cos(bullet.angle) * BULLET_SPEED;
        bullet.y += Math.sin(bullet.angle) * BULLET_SPEED;
        bullet.timeLeft -= deltaTime;

        for (let other of players.filter((p) => p.id != bullet.playerId)) {
            // Verifica a colizão, aplica o dano e mata o player
            const distance = Math.sqrt(
                (other.x + other.attributes.size / 2 - bullet.x) ** 2 + 
                (other.y + other.attributes.size / 2 - bullet.y) ** 2
            );
            if (distance <= other.attributes.size / 2) {
                other.health -= 10;
                bullets = bullets.filter((b) => b != bullet);
                if (other.health <= 0 && !other.isDead) {
                    killPlayer(io, other, players);
                }
            }
        }
    }
    // Atualiza os clientes
    bullets = bullets.filter((b) => b.timeLeft > 0);
    io.emit('update', alivePlayers, bullets, canvasSize);
}

// Função principal
async function main() {
    io.on('connect', (socket) => { // Dispara quando um usuário se conecta
        console.log("Player conectado:", socket.id);
        socket.on('start-game', (username, character) => { // Dispara após o usuário enviar seu username
            // Cria os inputs do player e uma nova classe player
            inputsMap[socket.id] = {
                up: false,
                down: false,
                left: false,
                right: false
            };
            players.push(new Player(socket.id, username, character, 25, 15, 45));
    
            socket.on('inputs', (inputs) => { // Dispara quando o usuário anda ou pula
                inputsMap[socket.id] = inputs;
            });
            socket.on('bullet', (angle) => { // Dispara quando atira um projétil
                const player = players.find((p) => p.id == socket.id);
                if (player && player.health > 0) {
                    bullets.push(new Bullet(player, null, angle)); // Cria uma nova classe bullet
                }
            });
            socket.on('disconnect', () => { // Dispara ao se desconetar do servidor
                players = players.filter(p => p.id != socket.id);
                delete inputsMap[socket.id];
            });
        });
    });

    setInterval(() => { // Atualiza o servidor 
        const now = Date.now();
        const deltaTime = now - lastUpdate;

        tick(deltaTime);
        lastUpdate = now;
    }, 1000 / TICK_RATE);

    // Inicializa o servidor
    app.use(express.static('public'));
    server.listen(PORT, () => {
        console.log("Server online!");
    });
}
main();