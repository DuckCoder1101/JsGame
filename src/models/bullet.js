class Bullet {
    constructor(player, texture, angle) {
        this.texture = texture || null;
        this.angle = angle;
        this.timeLeft = 1000;
        this.playerId = player.id;
        this.x = player.x + player.attributes.size / 2;
        this.y = player.y;
    }
}

module.exports = Bullet
