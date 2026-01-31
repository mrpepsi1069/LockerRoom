<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LockerRoom - Discord Bot for Sports Teams</title>
    <meta name="description" content="Manage your sports team Discord server with LockerRoom bot - Schedule games, track availability, manage lineups, and more!">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        :root {
            --primary: #5865F2;
            --primary-dark: #4752C4;
            --secondary: #57F287;
            --dark: #23272A;
            --darker: #1E2124;
            --light: #FFFFFF;
            --gray: #99AAB5;
            --gray-dark: #2C2F33;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, var(--darker) 0%, var(--dark) 100%);
            color: var(--light);
            line-height: 1.6;
            overflow-x: hidden;
        }

        /* Header/Hero Section */
        .hero {
            text-align: center;
            padding: 80px 20px;
            background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
            position: relative;
            overflow: hidden;
        }

        .hero::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120"><path fill="%23ffffff" fill-opacity="0.05" d="M0,0 L1200,0 L1200,120 Q600,60 0,120 Z"/></svg>') repeat-x bottom;
            opacity: 0.1;
        }

        .hero-content {
            position: relative;
            z-index: 1;
        }

        .hero h1 {
            font-size: 3.5rem;
            margin-bottom: 20px;
            animation: fadeInUp 0.8s ease;
        }

        .hero p {
            font-size: 1.3rem;
            margin-bottom: 40px;
            opacity: 0.9;
            animation: fadeInUp 0.8s ease 0.2s backwards;
        }

        .btn-group {
            display: flex;
            gap: 20px;
            justify-content: center;
            flex-wrap: wrap;
            animation: fadeInUp 0.8s ease 0.4s backwards;
        }

        .btn {
            padding: 15px 35px;
            font-size: 1.1rem;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 10px;
            transition: all 0.3s ease;
            font-weight: 600;
        }

        .btn-primary {
            background: var(--light);
            color: var(--primary);
        }

        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 30px rgba(255, 255, 255, 0.3);
        }

        .btn-secondary {
            background: transparent;
            color: var(--light);
            border: 2px solid var(--light);
        }

        .btn-secondary:hover {
            background: var(--light);
            color: var(--primary);
            transform: translateY(-2px);
        }

        /* Statistics Section */
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 30px;
            padding: 60px 20px;
            max-width: 1200px;
            margin: 0 auto;
        }

        .stat-card {
            background: var(--gray-dark);
            padding: 30px;
            border-radius: 12px;
            text-align: center;
            transition: all 0.3s ease;
            border: 2px solid transparent;
        }

        .stat-card:hover {
            transform: translateY(-5px);
            border-color: var(--primary);
            box-shadow: 0 10px 30px rgba(88, 101, 242, 0.3);
        }

        .stat-icon {
            font-size: 3rem;
            margin-bottom: 15px;
        }

        .stat-number {
            font-size: 2.5rem;
            font-weight: bold;
            color: var(--secondary);
            margin-bottom: 10px;
        }

        .stat-label {
            font-size: 1.1rem;
            color: var(--gray);
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .loading {
            color: var(--gray);
            font-style: italic;
        }

        /* Servers Section */
        .section {
            padding: 60px 20px;
            max-width: 1200px;
            margin: 0 auto;
        }

        .section-title {
            font-size: 2.5rem;
            margin-bottom: 40px;
            text-align: center;
            color: var(--light);
        }

        .servers-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
        }

        .server-card {
            background: var(--gray-dark);
            padding: 20px;
            border-radius: 12px;
            border-left: 4px solid var(--primary);
            transition: all 0.3s ease;
        }

        .server-card:hover {
            transform: translateX(5px);
            box-shadow: 0 5px 20px rgba(88, 101, 242, 0.2);
        }

        .server-name {
            font-size: 1.3rem;
            font-weight: bold;
            margin-bottom: 10px;
            color: var(--light);
        }

        .server-info {
            display: flex;
            align-items: center;
            gap: 5px;
            color: var(--gray);
            margin-bottom: 5px;
        }

        .server-info span {
            font-size: 0.9rem;
        }

        /* Features Section */
        .features {
            background: var(--gray-dark);
            padding: 60px 20px;
        }

        .features-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 30px;
            max-width: 1200px;
            margin: 0 auto;
        }

        .feature-card {
            background: var(--dark);
            padding: 30px;
            border-radius: 12px;
            transition: all 0.3s ease;
        }

        .feature-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }

        .feature-icon {
            font-size: 3rem;
            margin-bottom: 15px;
        }

        .feature-title {
            font-size: 1.5rem;
            margin-bottom: 10px;
            color: var(--light);
        }

        .feature-description {
            color: var(--gray);
        }

        /* Footer */
        .footer {
            text-align: center;
            padding: 40px 20px;
            background: var(--darker);
            color: var(--gray);
        }

        /* Animations */
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        /* Responsive */
        @media (max-width: 768px) {
            .hero h1 {
                font-size: 2.5rem;
            }

            .hero p {
                font-size: 1.1rem;
            }

            .btn-group {
                flex-direction: column;
            }

            .stats {
                grid-template-columns: 1fr;
            }
        }

        /* Error/Loading States */
        .error-message {
            background: #ED4245;
            color: white;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
            margin: 20px;
        }

        .no-data {
            text-align: center;
            color: var(--gray);
            padding: 40px;
            font-size: 1.2rem;
        }
    </style>
</head>
<body>
    <!-- Hero Section -->
    <section class="hero">
        <div class="hero-content">
            <h1>🏆 LockerRoom Bot</h1>
            <p>The ultimate Discord bot for managing sports teams and gaming communities</p>
            <div class="btn-group">
                <a href="#" id="invite-btn" class="btn btn-primary">
                    <span>➕</span> Add to Discord
                </a>
                <a href="#" id="support-btn" class="btn btn-secondary">
                    <span>💬</span> Join Support Server
                </a>
            </div>
        </div>
    </section>

    <!-- Statistics Section -->
    <section class="stats">
        <div class="stat-card">
            <div class="stat-icon">🏰</div>
            <div class="stat-number" id="guild-count">
                <span class="loading">Loading...</span>
            </div>
            <div class="stat-label">Servers</div>
        </div>
        <div class="stat-card">
            <div class="stat-icon">👥</div>
            <div class="stat-number" id="user-count">
                <span class="loading">Loading...</span>
            </div>
            <div class="stat-label">Users</div>
        </div>
        <div class="stat-card">
            <div class="stat-icon">⚡</div>
            <div class="stat-number" id="uptime">
                <span class="loading">Loading...</span>
            </div>
            <div class="stat-label">Status</div>
        </div>
    </section>

    <!-- Servers Section -->
    <section class="section">
        <h2 class="section-title">🌐 Servers Using LockerRoom</h2>
        <div id="servers-container">
            <div class="loading" style="text-align: center; padding: 40px;">Loading servers...</div>
        </div>
    </section>

    <!-- Features Section -->
    <section class="features">
        <div class="section">
            <h2 class="section-title">✨ Features</h2>
            <div class="features-grid">
                <div class="feature-card">
                    <div class="feature-icon">⏰</div>
                    <div class="feature-title">Game Scheduling</div>
                    <div class="feature-description">Create game time polls with multiple time options. Players can select their availability with interactive buttons.</div>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">📋</div>
                    <div class="feature-title">Lineup Management</div>
                    <div class="feature-description">Organize team lineups and track player availability for matches and scrimmages.</div>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">🏅</div>
                    <div class="feature-title">Award System</div>
                    <div class="feature-description">Recognize players with custom awards and track achievements throughout the season.</div>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">🔔</div>
                    <div class="feature-title">Team Notifications</div>
                    <div class="feature-description">DM all team members at once with important announcements and updates.</div>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">👑</div>
                    <div class="feature-title">League Support</div>
                    <div class="feature-description">Manage multiple leagues within the same server with custom roles and permissions.</div>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">🛡️</div>
                    <div class="feature-title">Moderation Tools</div>
                    <div class="feature-description">Powerful moderation commands including timeout, kick, and ban with proper role hierarchy.</div>
                </div>
            </div>
        </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
        <p>© 2025 LockerRoom Bot. Made for sports teams and gaming communities.</p>
        <p style="margin-top: 10px; font-size: 0.9rem;">Powered by Discord.js</p>
    </footer>

    <script>
        // Configuration - Update these with your actual values
        const CONFIG = {
            apiUrl: 'https://endless-evangeline-ghostie-bots-7370516d.koyeb.app', // Your Koyeb app URL
            inviteUrl: 'https://discord.com/api/oauth2/authorize?client_id=1446687675330330826&permissions=8&scope=bot%20applications.commands',
            supportServerUrl: 'https://discord.gg/BkFJuu7DbN'
        };

        // Set invite and support links
        document.getElementById('invite-btn').href = CONFIG.inviteUrl;
        document.getElementById('support-btn').href = CONFIG.supportServerUrl;

        // Fetch bot statistics
        async function fetchBotStats() {
            try {
                const response = await fetch(`${CONFIG.apiUrl}/api/stats`);
                const data = await response.json();

                // Update statistics
                document.getElementById('guild-count').textContent = data.guilds || '0';
                
                // Use actual user count from API
                document.getElementById('user-count').textContent = (data.users || 0).toLocaleString();

                // Update status
                const statusElement = document.getElementById('uptime');
                if (data.status === 'online' && data.bot !== 'Starting') {
                    statusElement.innerHTML = '<span style="color: #57F287;">🟢 Online</span>';
                } else {
                    statusElement.innerHTML = '<span style="color: #ED4245;">🔴 Starting...</span>';
                }

                // Fetch server list
                await fetchServerList(data.guilds);

            } catch (error) {
                console.error('Error fetching bot stats:', error);
                document.getElementById('guild-count').innerHTML = '<span style="color: #ED4245;">Error</span>';
                document.getElementById('user-count').innerHTML = '<span style="color: #ED4245;">Error</span>';
                document.getElementById('uptime').innerHTML = '<span style="color: #ED4245;">🔴 Offline</span>';
                
                document.getElementById('servers-container').innerHTML = `
                    <div class="error-message">
                        ❌ Unable to fetch server data. The bot may be offline or experiencing issues.
                    </div>
                `;
            }
        }

        // Fetch server list from API
        async function fetchServerList(guildCount) {
            const container = document.getElementById('servers-container');
            
            try {
                const response = await fetch(`${CONFIG.apiUrl}/api/guilds`);
                const guilds = await response.json();
                
                if (guilds.length === 0) {
                    container.innerHTML = `
                        <div class="no-data">
                            Be the first to add LockerRoom to your server! 🚀
                        </div>
                    `;
                    return;
                }

                const serversHTML = guilds.map(guild => `
                    <div class="server-card">
                        <div class="server-name">🏰 ${guild.name}</div>
                        <div class="server-info">
                            <span>👥</span>
                            <span>${guild.memberCount.toLocaleString()} members</span>
                        </div>
                        <div class="server-info">
                            <span>🆔</span>
                            <span>${guild.id}</span>
                        </div>
                    </div>
                `).join('');

                container.innerHTML = `<div class="servers-grid">${serversHTML}</div>`;
            } catch (error) {
                console.error('Error fetching servers:', error);
                container.innerHTML = `
                    <div class="no-data">
                        🏰 Currently serving <strong>${guildCount}</strong> amazing communities!
                        <br><br>
                        <small style="color: var(--gray);">Join one of them by adding LockerRoom to your server!</small>
                    </div>
                `;
            }
        }

        // Load stats on page load
        fetchBotStats();

        // Refresh stats every 30 seconds
        setInterval(fetchBotStats, 30000);
    </script>
</body>
</html>
