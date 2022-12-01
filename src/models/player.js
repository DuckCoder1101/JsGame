class Player {
    constructor(id, name, size = 30, speed = 10, jumpForce = 20) {
        this.id = id;
        this.name = name;
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

module.exports = Player
