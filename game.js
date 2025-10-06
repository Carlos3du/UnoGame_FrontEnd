class Card {
    constructor(color, value) {
        this.color = color;
        this.value = value;
    }
    
    canPlayOn(topCard) {
        if (this.color === 'wild') return true;
        if (topCard.color === 'wild') return true;
        return this.color === topCard.color || this.value === topCard.value;
    }
    
    isSpecial() {
        return ['skip', 'reverse', 'draw2', 'wild', 'wilddraw4'].includes(this.value);
    }
}

class Deck {
    constructor() {
        this.cards = [];
        this.initialize();
        this.shuffle();
    }
    
    initialize() {
        const colors = ['red', 'yellow', 'green', 'blue'];
        const values = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'skip', 'reverse', 'draw2'];
        
        for (let color of colors) {
            for (let value of values) {
                this.cards.push(new Card(color, value));
                if (value !== '0') {
                    this.cards.push(new Card(color, value));
                }
            }
        }
        
        for (let i = 0; i < 4; i++) {
            this.cards.push(new Card('wild', 'wild'));
            this.cards.push(new Card('wild', 'wilddraw4'));
        }
    }
    
    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }
    
    draw() {
        if (this.cards.length === 0) {
            this.reshuffle();
        }
        return this.cards.pop();
    }
    
    reshuffle() {
        const discardedCards = game.discardPile.slice(0, -1);
        this.cards = discardedCards;
        this.shuffle();
        game.discardPile = [game.discardPile[game.discardPile.length - 1]];
    }
}

class Player {
    constructor(name) {
        this.name = name;
        this.hand = [];
        this.hasCalledUno = false;
    }
    
    addCard(card) {
        this.hand.push(card);
    }
    
    playCard(cardIndex) {
        return this.hand.splice(cardIndex, 1)[0];
    }
    
    canPlay(topCard) {
        return this.hand.some(card => card.canPlayOn(topCard));
    }
    
    getPlayableCards(topCard) {
        return this.hand.map((card, index) => ({card, index}))
                        .filter(({card}) => card.canPlayOn(topCard));
    }
}

class UnoGame {
    constructor(player1Name, player2Name) {
        this.players = [new Player(player1Name), new Player(player2Name)];
        this.currentPlayerIndex = 0;
        this.direction = 1;
        this.deck = new Deck();
        this.discardPile = [];
        this.gameLog = [];
        this.gameHistory = [];
        this.gameNumber = 1;
        this.pendingColorChoice = false;
        this.isTransitioning = false;
        this.initialize();
    }
    
    initialize() {
        for (let i = 0; i < 7; i++) {
            this.players[0].addCard(this.deck.draw());
            this.players[1].addCard(this.deck.draw());
        }
        
        let startCard;
        do {
            startCard = this.deck.draw();
        } while (startCard.color === 'wild');
        
        this.discardPile.push(startCard);
        this.updateDisplay();
        this.addToLog(`Jogo iniciado! Carta inicial: ${this.formatCard(startCard)}`);
    }
    
    getCurrentPlayer() {
        return this.players[this.currentPlayerIndex];
    }
    
    getTopCard() {
        return this.discardPile[this.discardPile.length - 1];
    }
    
    nextPlayer() {
        this.currentPlayerIndex = (this.currentPlayerIndex + this.direction + 2) % 2;
        this.startPlayerTransition();
    }
    
    startPlayerTransition() {
        this.isTransitioning = true;
        this.hideAllCards();
        this.addToLog(`Vez de ${this.getCurrentPlayer().name}! Aguarde...`);
        
        setTimeout(() => {
            this.isTransitioning = false;
            this.updateDisplay();
        }, 3000);
    }
    
    hideAllCards() {
        document.getElementById('player1Cards').innerHTML = '<div class="waiting-message">Aguardando...</div>';
        document.getElementById('player2Cards').innerHTML = '<div class="waiting-message">Aguardando...</div>';
        
        const drawBtn = document.getElementById('drawCardBtn');
        const unoBtn = document.getElementById('unoBtn');
        drawBtn.disabled = true;
        unoBtn.disabled = true;
    }
    
    playCard(playerIndex, cardIndex) {
        if (playerIndex !== this.currentPlayerIndex || this.pendingColorChoice || this.isTransitioning) return false;
        
        const player = this.players[playerIndex];
        const card = player.hand[cardIndex];
        const topCard = this.getTopCard();
        
        if (!card.canPlayOn(topCard)) return false;
        
        const playedCard = player.playCard(cardIndex);
        this.discardPile.push(playedCard);
        
        this.addToLog(`${player.name} jogou ${this.formatCard(playedCard)}`);
        
        if (player.hand.length === 1 && !player.hasCalledUno) {
            player.addCard(this.deck.draw());
            player.addCard(this.deck.draw());
            this.addToLog(`${player.name} esqueceu de gritar UNO! Comprou 2 cartas.`);
        }
        
        if (player.hand.length === 0) {
            this.endGame(player);
            return true;
        }
        
        if (playedCard.color === 'wild') {
            this.pendingColorChoice = true;
            this.showColorPicker();
            return true;
        }
        
        this.handleSpecialCard(playedCard);
        this.nextPlayer();
        this.updateDisplay();
        
        return true;
    }
    
    handleSpecialCard(card) {
        switch (card.value) {
            case 'skip':
                this.addToLog(`${this.players[(this.currentPlayerIndex + 1) % 2].name} perdeu a vez!`);
                this.nextPlayer();
                break;
            case 'reverse':
                this.direction *= -1;
                this.addToLog('Direção do jogo invertida!');
                break;
            case 'draw2':
                const nextPlayer = this.players[(this.currentPlayerIndex + 1) % 2];
                nextPlayer.addCard(this.deck.draw());
                nextPlayer.addCard(this.deck.draw());
                this.addToLog(`${nextPlayer.name} comprou 2 cartas!`);
                this.nextPlayer();
                break;
            case 'wilddraw4':
                const opponent = this.players[(this.currentPlayerIndex + 1) % 2];
                for (let i = 0; i < 4; i++) {
                    opponent.addCard(this.deck.draw());
                }
                this.addToLog(`${opponent.name} comprou 4 cartas!`);
                this.nextPlayer();
                break;
        }
    }
    
    drawCard(playerIndex) {
        if (playerIndex !== this.currentPlayerIndex || this.pendingColorChoice || this.isTransitioning) return;
        
        const player = this.players[playerIndex];
        const drawnCard = this.deck.draw();
        player.addCard(drawnCard);
        
        this.addToLog(`${player.name} comprou uma carta`);
        
        if (drawnCard.canPlayOn(this.getTopCard())) {
            this.updateDisplay();
            return;
        }
        
        this.nextPlayer();
        this.updateDisplay();
    }
    
    checkAITurn() {
        return;
    }
    
    aiPlay() {
        return;
    }
    
    chooseColor(color) {
        if (!this.pendingColorChoice) return;
        
        const topCard = this.getTopCard();
        topCard.color = color;
        this.pendingColorChoice = false;
        
        this.addToLog(`Nova cor escolhida: ${color}`);
        
        if (topCard.value !== 'wilddraw4') {
            this.nextPlayer();
        }
        
        this.updateDisplay();
        this.hideColorPicker();
    }
    
    callUno(playerIndex) {
        const player = this.players[playerIndex];
        if (player.hand.length === 2) {
            player.hasCalledUno = true;
            this.addToLog(`${player.name} gritou UNO!`);
        }
    }
    
    endGame(winner) {
        const loser = this.players.find(p => p !== winner);
        this.gameHistory.push({
            gameNumber: this.gameNumber,
            winner: winner.name,
            remainingCards: loser.hand.length
        });
        
        this.addToLog(`${winner.name} venceu a partida!`);
        this.updateGameHistory();
        this.showGameOverModal(winner);
    }
    
    newGame() {
        this.players.forEach(player => {
            player.hand = [];
            player.hasCalledUno = false;
        });
        
        this.currentPlayerIndex = 0;
        this.direction = 1;
        this.deck = new Deck();
        this.discardPile = [];
        this.pendingColorChoice = false;
        this.isTransitioning = false;
        this.gameNumber++;
        
        this.initialize();
        this.hideGameOverModal();
    }
    
    addToLog(message) {
        this.gameLog.push(message);
        if (this.gameLog.length > 10) {
            this.gameLog.shift();
        }
        this.updateGameLog();
    }
    
    formatCard(card) {
        return `${card.color} ${card.value}`;
    }
    
    updateDisplay() {
        this.updatePlayerNames();
        this.updateScoreboard();
        this.updateCurrentPlayer();
        this.updateCards();
        this.updateDiscardPile();
    }
    
    updatePlayerNames() {
        document.getElementById('player1Name').textContent = this.players[0].name;
        document.getElementById('player2Name').textContent = this.players[1].name;
        document.getElementById('currentPlayerName').textContent = this.getCurrentPlayer().name;
        
        document.getElementById('player1HandTitle').textContent = `Cartas de ${this.players[0].name}:`;
        document.getElementById('player2HandTitle').textContent = `Cartas de ${this.players[1].name}:`;
    }
    
    updateScoreboard() {
        const player1Score = document.getElementById('player1Score');
        const player2Score = document.getElementById('player2Score');
        
        player1Score.classList.toggle('active', this.currentPlayerIndex === 0);
        player2Score.classList.toggle('active', this.currentPlayerIndex === 1);
        
        player1Score.querySelector('.score').textContent = `${this.players[0].hand.length} cartas`;
        player2Score.querySelector('.score').textContent = `${this.players[1].hand.length} cartas`;
    }
    
    updateCurrentPlayer() {
        const currentPlayerDisplay = document.getElementById('currentPlayerDisplay');
        const drawBtn = document.getElementById('drawCardBtn');
        const unoBtn = document.getElementById('unoBtn');
        
        if (!this.isTransitioning) {
            drawBtn.disabled = false;
            unoBtn.disabled = false;
        }
        
        currentPlayerDisplay.classList.add('highlight');
        setTimeout(() => currentPlayerDisplay.classList.remove('highlight'), 1000);
    }
    
    updateCards() {
        this.updatePlayerHand(0, 'player1Cards');
        this.updatePlayerHand(1, 'player2Cards');
    }
    
    updatePlayerHand(playerIndex, containerId) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';
        
        if (this.isTransitioning) {
            const waitingDiv = document.createElement('div');
            waitingDiv.className = 'waiting-message';
            waitingDiv.textContent = 'Aguardando...';
            container.appendChild(waitingDiv);
            return;
        }
        
        const player = this.players[playerIndex];
        const topCard = this.getTopCard();
        const isCurrentPlayer = playerIndex === this.currentPlayerIndex;
        
        if (!isCurrentPlayer) {
            player.hand.forEach(() => {
                const cardElement = document.createElement('div');
                cardElement.className = 'card card-back';
                cardElement.textContent = '';
                container.appendChild(cardElement);
            });
            return;
        }
        
        player.hand.forEach((card, index) => {
            const cardElement = document.createElement('div');
            cardElement.className = `card ${card.color}`;
            cardElement.textContent = card.value;
            
            if (card.canPlayOn(topCard) && !this.pendingColorChoice) {
                cardElement.classList.add('playable');
            }
            
            cardElement.addEventListener('click', () => {
                if (this.playCard(playerIndex, index)) {
                    cardElement.classList.add('animating');
                }
            });
            
            container.appendChild(cardElement);
        });
    }
    
    updateDiscardPile() {
        const currentCard = document.getElementById('currentCard');
        const topCard = this.getTopCard();
        currentCard.className = `card ${topCard.color}`;
        currentCard.textContent = topCard.value;
    }
    
    updateGameLog() {
        const logList = document.getElementById('gameLogList');
        logList.innerHTML = '';
        
        this.gameLog.forEach(message => {
            const li = document.createElement('li');
            li.textContent = message;
            logList.appendChild(li);
        });
        
        logList.scrollTop = logList.scrollHeight;
    }
    
    updateGameHistory() {
        const tbody = document.getElementById('gameHistoryBody');
        tbody.innerHTML = '';
        
        this.gameHistory.forEach(game => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${game.gameNumber}</td>
                <td>${game.winner}</td>
                <td>${game.remainingCards}</td>
            `;
            tbody.appendChild(row);
        });
    }
    
    showColorPicker() {
        document.getElementById('colorPickerModal').classList.add('show');
    }
    
    hideColorPicker() {
        document.getElementById('colorPickerModal').classList.remove('show');
    }
    
    showGameOverModal(winner) {
        document.getElementById('winnerMessage').textContent = `${winner.name} venceu!`;
        document.getElementById('gameOverModal').classList.add('show');
    }
    
    hideGameOverModal() {
        document.getElementById('gameOverModal').classList.remove('show');
    }
}

let game;

document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const player1Name = urlParams.get('player1') || 'Jogador 1';
    const player2Name = urlParams.get('player2') || 'Jogador 2';
    
    game = new UnoGame(player1Name, player2Name);
    
    document.getElementById('drawCardBtn').addEventListener('click', () => {
        game.drawCard(game.currentPlayerIndex);
    });
    
    document.getElementById('unoBtn').addEventListener('click', () => {
        game.callUno(game.currentPlayerIndex);
    });
    
    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            game.chooseColor(btn.dataset.color);
        });
    });
    
    document.getElementById('newGameBtn').addEventListener('click', () => {
        game.newGame();
    });
    
    document.getElementById('backToSetupBtn').addEventListener('click', () => {
        window.location.href = 'index.html';
    });
});