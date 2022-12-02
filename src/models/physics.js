// Verifica colizão entre 2 quadriláteros
function isColliding(rect1, rect2) {
    return (
        rect1.x < rect2.x + rect2.attributes.size &&
        rect1.x + rect1.attributes.size > rect2.x &&
        rect1.y < rect2.y + rect2.attributes.size &&
        rect1.attributes.size + rect1.y > rect2.y
    );
}

// Verifica se um jogador está colidindo com os demais
function isCollidingWithPlayer(player, players) {
    const otherPlayers = players.filter((p) => p.id != player.id);
    for (let other of otherPlayers) {
        if (!other.isDead && isColliding(player, other)) {
            return [true, other];
        }
    }
    return false;
}

function applyPhysics(player, gravity, canvasSize, players) {
    // Aplica a gravidade
    const ground = canvasSize.y - player.attributes.size - 120;
    player.velY += gravity;
    player.y += player.velY;

    // Verifica colizão e o ground
    const isPlayerColling = isCollidingWithPlayer(player, players);
    if (player.y >= ground || isPlayerColling) {
        player.y = isPlayerColling ? isPlayerColling[1].y - player.attributes.size : ground;
        player.velY = 0;
        return true;
    }
    return false;
}

module.exports = { applyPhysics, isCollidingWithPlayer, isColliding }
