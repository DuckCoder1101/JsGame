class Player {
    constructor(id, name, character, size = 30, speed = 10, jumpForce = 20) {
        this.id = id;
        this.name = name;
        this.character = character;
        this.x = size / 2, this.y = 0;
        this.velY = 0;
        this.health = 100;
        this.isDead = false;
        this.attributes = {
            size,
            speed,
            jumpForce
        };
    }
}

function killPlayer(io, player, players) {
    // Mata o player
    const socket = io.sockets.sockets.get(player.id);
    player.health = 0;
    player.isDead = true;

    // Filtra os players vivos e verifica o fim do jogo
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

module.exports = { Player, killPlayer }