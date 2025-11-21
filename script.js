const API_BASE = 'http://localhost:3000/api';

// Load user data when page loads
window.addEventListener('load', async () => {
    try {
        const response = await fetch(`${API_BASE}/user`);
        const userData = await response.json();
        document.getElementById('coin-count').innerText = userData.coin_balance;
        document.getElementById('love-count').innerText = userData.love_count;
        document.getElementById('copy-count').innerText = userData.copy_count;
        
        loadCallHistory();
    } catch (error) {
        console.log('Using offline mode');
    }
});

// Load call history function
async function loadCallHistory() {
    try {
        const response = await fetch(`${API_BASE}/history`);
        const history = await response.json();
        
        const historySection = document.getElementById("history-section");
        historySection.innerHTML = '';
        
        history.forEach(call => {
            const callTime = new Date(call.call_time).toLocaleTimeString();
            const historyItem = document.createElement("div");
            historyItem.innerHTML = `
                <div class="bg-[#cdcaca36] w-[98%] h-[70px] m-auto mt-2 flex justify-between items-center rounded-sm">
                    <div class="p-2">
                        <h1 class="font-semibold text-[15px]">${call.service_name}</h1>
                        <p>${call.phone_number}</p>
                    </div>
                    <div class="p-2 text-[13px]">${callTime}</div>
                </div>
            `;
            historySection.appendChild(historyItem);
        });
    } catch (error) {
        console.log('Could not load history from server');
    }
}

// UPDATED: Love Button with Database Connection
const loveButton = document.getElementsByClassName("love-button");
for (let love of loveButton) {
    love.addEventListener("click", async function () {
        try {
            // 🔥 Call API to update database
            await fetch(`${API_BASE}/favorite`, { method: 'POST' });
            console.log('✅ Love count updated in database');
        } catch (error) {
            console.log('❌ Failed to update database:', error);
        }
        
        // Update UI
        let count = Number(document.getElementById("love-count").innerText);
        count += 1;
        document.getElementById("love-count").innerText = count;
        love.style.color = "red";
    });
}

// UPDATED: Copy Button with Database Connection
const copyButton = document.getElementsByClassName("copyBtn");
for (let CB of copyButton) {
    CB.addEventListener("click", async function () {
        try {
            // 🔥 Call API to update database
            await fetch(`${API_BASE}/copy`, { method: 'POST' });
            console.log('✅ Copy count updated in database');
        } catch (error) {
            console.log('❌ Failed to update database:', error);
        }
        
        // Update UI
        let copycount = Number(document.getElementById("copy-count").innerText);
        copycount += 1;
        document.getElementById("copy-count").innerText = copycount;

        const card = CB.parentNode.parentNode;
        const text = card.querySelector("h1").innerText;
        const num = card.querySelector("h2").innerText;

        try {
            await navigator.clipboard.writeText(num);
            alert("Copied to clipboard: " + text + " " + num);
        } catch (err) {
            alert("Copy failed. Please copy manually: " + text + " " + num);
        }
    });
}

// UPDATED: Call Button with Database Connection
const callButton = document.getElementsByClassName("call-button");
for (let CB of callButton) {
    CB.addEventListener("click", async function () {
        const card = CB.parentNode.parentNode;
        const text = card.querySelector("h1").innerText;
        const num = card.querySelector("h2").innerText;
        
        try {
            // 🔥 Call API to make call and save to database
            const response = await fetch(`${API_BASE}/call`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    service_name: text, 
                    phone_number: num 
                })
            });
            
            if (response.ok) {
                console.log('✅ Call saved to database');
                
                // Update UI
                let count = Number(document.getElementById("coin-count").innerText);
                count -= 20;
                document.getElementById("coin-count").innerText = count;
                
                alert('📞 You are calling ' + text + ': ' + num);
                
                // 🔥 Reload call history from database
                await loadCallHistory();
            } else {
                const error = await response.json();
                alert('🚫 ' + error.error);
            }
        } catch (error) {
            console.log('❌ Database connection failed, using offline mode');
            
            // Fallback to offline mode
            let count = Number(document.getElementById("coin-count").innerText);
            if (count >= 20) {
                count -= 20;
                document.getElementById("coin-count").innerText = count;
                
                let now = new Date();
                let curTime = now.toLocaleTimeString();
                alert('📞 You are calling ' + text + ': ' + num);

                let newHistory = document.getElementById("history-section");
                let addHistory = document.createElement("div");
                addHistory.innerHTML = `<div class="bg-[#cdcaca36] w-[98%] h-[70px] m-auto mt-2 flex justify-between items-center rounded-sm">
                    <div class="p-2">
                        <h1 class="font-semibold text-[15px]">${text}</h1>
                        <p>${num}</p>
                    </div>
                    <div class="p-2 text-[13px]">${curTime}</div>
                </div>`;
                newHistory.appendChild(addHistory);
            } else {
                alert('🚫 Insufficient Balance!\nYou need at least 20 coins to make a call.');
            }
        }
    });
}
document.getElementById('resetButton').addEventListener('click', async function() {
    // Confirm before resetting
    if (confirm('🔄 Are you sure you want to reset all data?\n\n• Coins will reset to 100\n• Love count will reset to 0\n• Copy count will reset to 0\n• All call history will be deleted\n\nThis action cannot be undone!')) {
        
        try {
            const response = await fetch(`${API_BASE}/reset`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
                const result = await response.json();
                
                // Update UI with reset values
                document.getElementById('coin-count').innerText = '100';
                document.getElementById('love-count').innerText = '0';
                document.getElementById('copy-count').innerText = '0';
                
                // Clear call history display
                document.getElementById('history-section').innerHTML = '';
                
                // Reset all heart button colors
                const heartButtons = document.getElementsByClassName('love-button');
                for (let heart of heartButtons) {
                    heart.style.color = '';
                }
                
                alert('✅ Database reset successfully!\n\n• Coins: 100\n• Love count: 0\n• Copy count: 0\n• Call history: Cleared');
                console.log('✅ Database reset completed');
                
            } else {
                const error = await response.json();
                alert('❌ Reset failed: ' + error.error);
            }
            
        } catch (error) {
            console.log('❌ Reset failed:', error);
            alert('❌ Could not connect to server for reset');
        }
    }
});

// Clear button (existing code)
document.getElementById('clearButton').addEventListener('click', function(){
    document.getElementById('history-section').innerHTML = '';
});
// Clear button
document.getElementById('clearButton').addEventListener('click', function(){
    document.getElementById('history-section').innerHTML = '';
});