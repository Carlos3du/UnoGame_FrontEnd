document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('gameSetupForm');
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const player1Name = document.getElementById('player1Name').value.trim();
        const player2Name = document.getElementById('player2Name').value.trim();
        
        if (player1Name && player2Name) {
            const params = new URLSearchParams({
                player1: player1Name,
                player2: player2Name
            });
            
            window.location.href = 'game.html?' + params.toString();
        }
    });
});