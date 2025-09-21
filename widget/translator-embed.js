(function() {
    const widgetStyles = `
        .translator-widget-embed {
            width: 100%;
            max-width: 600px;
            height: 500px;
            background: white;
            border: 1px solid #ddd;
            border-radius: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            display: flex;
            flex-direction: column;
            .translator-send-embed { margin-top: 8px; }
            margin: 20px auto;
            position: relative;
        }
        .translator-widget-embed.closed { 
            height: 60px; 
            cursor: pointer; 
        }
        .translator-header-embed {
            background: #c6d537;
            color: #333;
            padding: 15px;
            border-radius: 10px 10px 0 0;
            font-weight: bold;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .translator-toggle-embed { 
            background: none; 
            border: none; 
            color: #333; 
            font-size: 18px; 
            cursor: pointer; 
        }
        .translator-chat-embed { 
            flex: 1; 
            padding: 10px; 
            overflow-y: auto; 
            display: flex; 
            flex-direction: column; 
            .translator-send-embed { margin-top: 8px; }
            gap: 8px; 
        }
        .translator-message-embed { 
            padding: 10px 14px; 
            border-radius: 12px; 
            max-width: 85%; 
            word-wrap: break-word; 
            line-height: 1.4; 
            font-size: 14px;
        }
        .translator-message-embed.user { 
            background: #e3f2fd; 
            align-self: flex-end; 
            margin-left: auto; 
            color: #1976d2;
            border: 1px solid #bbdefb;
        }
        .translator-message-embed.bot { 
            background: #f8f9fa; 
            align-self: flex-start; 
            color: #212529;
            border: 1px solid #e9ecef;
            white-space: pre-line;
        }
        .from-label-embed {
            font-weight: bold;
            color: #6c757d;
            margin-bottom: 4px;
            font-size: 12px;
        }
        .language-code {
            font-weight: bold;
            color: #8a9c2a;
            margin-right: 8px;
        }
        .translator-input-area-embed { 
            padding: 10px; 
            border-top: 1px solid #eee; 
            display: flex; 
            gap: 8px; 
        }
        .translator-input-embed { 
            flex: 1; 
            padding: 10px; 
            border: 1px solid #ddd; 
            border-radius: 20px; 
            outline: none; 
        }
        .translator-input-embed:focus { 
            border-color: #c6d537; 
        }
        .translator-send-embed { 
            padding: 10px 15px; 
            background: #c6d537; 
            color: #333; 
            border: none; 
            border-radius: 20px; 
            cursor: pointer; 
        }
        .translator-send-embed:hover { 
            background: #b8c432; 
        }
        .translator-send-embed:disabled { 
            background: #ccc; 
            cursor: not-allowed; 
        }
        @media (max-width: 768px) { 
            .translator-input-area-embed { flex-direction: column; }
            .translator-send-embed { margin-top: 8px; }
            .translator-widget-embed { 
                width: 95%; 
                margin: 10px auto;
            } 
        }
    `;

    // Добавляем стили
    const styleSheet = document.createElement("style");
    styleSheet.textContent = widgetStyles;
    document.head.appendChild(styleSheet);

    // Создаем виджет
    const widget = document.createElement("div");
    widget.className = "translator-widget-embed";
    widget.innerHTML = [
        '<div class="translator-header-embed">',
        '<span>TBuddy Translator</span>',
        '<button class="translator-toggle-embed">−</button>',
        '</div>',
        '<div class="translator-chat-embed" id="translator-chat-embed">',
        '<div class="translator-message-embed bot">👋 Hi! I\'m translation bot TBuddy. What\'s your name?</div>',
        '</div>',
        '<div class="translator-input-area-embed">',
        '<input type="text" class="translator-input-embed" id="translator-input-embed" placeholder="Type your name..." />',
        '<button class="translator-send-embed" id="translator-send-embed">Send</button>',
        '</div>'
    ].join('');

    // Встраиваем виджет в контейнер
    const container = document.getElementById('tbuddy-translator-container');
    if (container) {
        container.appendChild(widget);
    } else {
        console.error('TBuddy: Container with id="tbuddy-translator-container" not found!');
        return;
    }

    const toggleBtn = widget.querySelector(".translator-toggle-embed");
    const chatArea = widget.querySelector(".translator-chat-embed");
    const input = widget.querySelector(".translator-input-embed");
    const sendBtn = widget.querySelector(".translator-send-embed");

    let isOpen = true;
    let sessionId = "embed-" + Math.random().toString(36).substr(2, 9);
    let userName = "";
    let step = "name";

    function toggleWidget() {
        isOpen = !isOpen;
        if (isOpen) {
            widget.classList.remove("closed");
            toggleBtn.textContent = "−";
        } else {
            widget.classList.add("closed");
            toggleBtn.textContent = "+";
        }
    }

    toggleBtn.addEventListener("click", toggleWidget);

    function addMessage(text, isUser) {
        const message = document.createElement("div");
        message.className = "translator-message-embed " + (isUser ? "user" : "bot");
        
        if (!isUser && text.includes("from " + userName)) {
            const parts = text.split("from " + userName);
            if (parts.length === 2) {
                const fromLabel = document.createElement("div");
                fromLabel.className = "from-label-embed";
                fromLabel.textContent = "from " + userName;
                message.appendChild(fromLabel);
                
                const translationText = document.createElement("div");
                // Правильная обработка переносов строк для переводов
                let content = parts[1].trim();
                content = content.replace(/\\n/g, '\n'); // Заменяем \\n на \n
                content = content.replace(/\n\n/g, '<br>'); // Двойные переносы на одинарные <br>
                content = content.replace(/\n/g, '<br>'); // Одинарные переносы на <br>
                
                // Стилизуем коды языков
                content = content.replace(/^([A-Z]{2}):\s*/gm, '<span class="language-code">$1:</span>');
                
                translationText.innerHTML = content;
                message.appendChild(translationText);
            } else {
                let content = text.replace(/\\n/g, '\n');
                content = content.replace(/\n\n/g, '<br><br>');
                content = content.replace(/\n/g, '<br>');
                message.innerHTML = content;
            }
        } else {
            let content = text.replace(/\\n/g, '\n');
            content = content.replace(/\n\n/g, '<br><br>');
            content = content.replace(/\n/g, '<br>');
            message.innerHTML = content;
        }
        
        chatArea.appendChild(message);
        
        const messages = chatArea.querySelectorAll(".translator-message-embed");
        if (messages.length > 20) {
            messages[1].remove();
        }
        
        chatArea.scrollTop = chatArea.scrollHeight;
    }

    function updatePlaceholder(text) {
        input.placeholder = text;
    }

    async function sendMessage() {
        const text = input.value.trim();
        if (!text) return;

        addMessage(text, true);
        input.value = "";
        sendBtn.disabled = true;
        sendBtn.textContent = "...";

        try {
            if (step === "name") {
                userName = text;
                step = "languages";
                
                const exampleText = [
                    `Nice to meet you, ${userName}! Let's set languages: just type 2 or 3 languages you want to use.`,
                    "",
                    "Examples:",
                    "- \"I want English, Spanish, French\"",
                    "- \"Russian, Korean, Japanese\"", 
                    "- \"English and German\""
                ].join("\\n");
                
                addMessage(exampleText, false);
                updatePlaceholder("Enter languages...");
                
            } else if (step === "languages") {
                const response = await fetch("/api/setup-languages", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-Session-ID": sessionId
                    },
                    body: JSON.stringify({ languageInput: text })
                });

                const data = await response.json();
                
                if (response.ok) {
                    step = "ready";
                    addMessage("✅ Languages have been set up successfully!\\n\\n" + data.message, false);
                    updatePlaceholder("Type text to translate...");
                } else {
                    console.error("Setup languages error:", data);
                    addMessage("Sorry, I couldn't set up those languages. Please try again with clear language names like 'English, Spanish, French'", false);
                }
                
            } else if (step === "ready") {
                const response = await fetch("/api/translate", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-Session-ID": sessionId
                    },
                    body: JSON.stringify({ text: text })
                });

                const data = await response.json();
                
                if (response.ok) {
                    if (data.translation) {
                        addMessage("from " + userName + "\\n\\n" + data.translation, false);
                    } else if (data.message) {
                        addMessage(data.message, false);
                    } else {
                        addMessage("Translation completed!", false);
                    }
                } else {
                    console.error("Translation API error:", data);
                    if (data.error) {
                        addMessage("Error: " + data.error, false);
                    } else {
                        addMessage("Sorry, there was an error with the translation. Please try again.", false);
                    }
                }
            }
        } catch (error) {
            console.error("Widget error:", error);
            addMessage("Sorry, I could not process your request. Please try again.", false);
        }

        sendBtn.disabled = false;
        sendBtn.textContent = "Send";
    }

    sendBtn.addEventListener("click", sendMessage);
    input.addEventListener("keypress", function(e) {
        if (e.key === "Enter") {
            sendMessage();
        }
    });

})();