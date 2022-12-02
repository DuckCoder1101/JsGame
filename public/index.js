const socket = io();
const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
const options = {
  appid: '13f9fe0e095947d199119c85eecd31d9',
  channel: 'general',
  uid: null,
  token: '007eJxTYNha0fLlwsqNZt77Cr9u/rA213rW7UyjwnNMd8/eOjYrovCjAoOhcZplWqpBqoGlqaWJeYqhpaWhoWWyhWlqanKKsWGKJXd/e3JDICOD8ZLrLIwMEAjiszOkp+alFiXmMDAAAN77JAg=',
};
var localTracks = {
    audioTrack: null
};
var remoteUsers = {};
var isMute = true;

const canvas = document.querySelector('#canvas');
const ctx = canvas.getContext('2d');

var bulletsMap = [];
var playersMap = [];
var selectedCharacter = "https://play-lh.googleusercontent.com/p7rx-TDw8mSXmnN5oreMbOrC6FTumoRsnz8rDxUHL6-7xYtLlzcyj1GS8UKyBx5eJg";
var inputs = {
    up: false,
    down: false,
    left: false,
    right: false,
    jump: false,
};

async function subscribe(user, mediaType) {
    await client.subscribe(user, mediaType);
    if (mediaType === 'audio') {
        user.audioTrack.play();
    }
}

function handleUserPublished(user, mediaType) {
    const id = user.uid;
    remoteUsers[id] = user;
    subscribe(user, mediaType);
}

function handleUserUnpublished(user) {
    const id = user.uid;
    delete remoteUsers[id];
}  

async function join() {
    client.on("user-published", handleUserPublished);
    client.on("user-unpublished", handleUserUnpublished);
    
    [ options.uid, localTracks.audioTrack ] = await Promise.all([
        client.join(options.appid, options.channel, options.token || null),
        AgoraRTC.createMicrophoneAudioTrack(),
    ]);
    
    await client.publish(Object.values(localTracks));
    console.log("publish success");
}

window.addEventListener('mouseup', (ev) => {
    const deltaX = ev.clientX - canvas.width / 2;
    const deltaY = ev.clientY - canvas.height / 2;
    
    const rad = Math.atan2(deltaY, deltaX);
    socket.emit('bullet', rad);
});

window.addEventListener('keydown', (ev) => {
    let key = ev.key.toLowerCase();                             
    
    if (ev.code == 'Space' || key == 'arrowup') {
        inputs.up = true;
    } else if (key == 'shift' || key == 'arrowdown') {
        inputs.down = true;
    } else if (key == 'a' || key == 'arrowleft') {
        inputs.left = true;
    } else if (key == 'd' || key == 'arrowright') {
        inputs.right = true;
    }
    socket.emit('inputs', inputs);
});

window.addEventListener('keyup', (ev) => {
    let key = ev.key.toLowerCase();
    
    if (ev.code == 'Space' || key == 'arrowup') {
        inputs.up = false;
    } else if (key == 'shift' || key == 'arrowdown') {
        inputs.down = false;
    } else if (key == 'a' || key == 'arrowleft') {
        inputs.left = false;
    } else if (key == 'd' || key == 'arrowright') {
        inputs.right = false;
    }
    socket.emit('inputs', inputs);
});

document.getElementById('voice-controller').addEventListener('click', (ev) => {
    isMute = !isMute;
    ev.currentTarget.innerHTML = isMute ? "Desmutar" : "Mutar";

    if (localTracks.audioTrack) {
        localTracks.audioTrack.setEnabled(!isMute);
    } else {
        ev.currentTarget.dispatchEvent('click');
        join();
    }
});

document.querySelectorAll('.character').forEach((el) => {
    el.addEventListener('click', (ev) => {
        if (!el.classList.contains('selectedCharacter')) {
            const other = document.querySelector('.selectedCharacter');
            if (other) {
                other.classList.remove('selectedCharacter');
            }
            
            selectedCharacter = el.getAttribute('img-path');
            el.classList.add('selectedCharacter');
        }
    });
});

document.getElementById('start-game').onclick = () => {
    let input = document.querySelector('#username');
    if (!input.value) {
        alert("Digite um nome válido!");
    } else if (playersMap.find((p) => p.name == input.value)) {
        alert("Este nome já está sendo usado!");
    } else {
        socket.emit('start-game', input.value, selectedCharacter);
        input.parentElement.remove();   
    }
};

socket.on('update', (srcPlayers, srcBullets, { x, y }) => {
    playersMap = srcPlayers;
    bulletsMap = srcBullets;
    canvas.width = x;
    canvas.height = y;
});

socket.on('game-over', () => {
    alert('game over');
});

socket.on('end-game', (winner, isTie = false) => {  
    const screenEl = document.getElementById('end-screen');
    const timeEl = document.getElementById('time'); 
    timeEl.innerHTML = "Recomeçando em 5 segundos.";

    const winnerEl = document.getElementById('winner');
    winnerEl.innerHTML = isTie ? "O jogo deu empate!" : `"${winner.name}" ganhou o jogo!`;
    screenEl.style.display = 'block';
    
    let i = 5;
    const interval = setInterval(() => {
        if (i > 1) {
            i--;
            timeEl.innerHTML = `Recomeçando em ${i} segundos.`;
        } else {
            clearInterval(interval);
            screenEl.style.display = 'none';
        }
    }, 1000);
});

async function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'green';
    ctx.fillRect(0, canvas.height - 120, canvas.width, 120);
    
    ctx.fillStyle = 'black';
    for (let { x, y, name, character, attributes } of playersMap) {
        const img = new Image(attributes.size, attributes.size);
        img.src = character;
    
        ctx.fillStyle = 'black';
        ctx.textAlign = 'center';
        ctx.font = '12px Arial';
        //ctx.fillRect(x, y, attributes.size, attributes.size);
        ctx.drawImage(img, x, y, attributes.size, attributes.size);
        ctx.fillText(name, x + attributes.size / 2, y -12, canvas.width);
    }

    for (let { x, y } of bulletsMap) {
        ctx.fillRect(x, y, 5, 5);
    }
    requestAnimationFrame(update);
}
requestAnimationFrame(update);