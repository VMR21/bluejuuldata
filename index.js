const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

// Use CORS middleware
app.use(cors());

// API details
const apiUrl = "https://roobetconnect.com/affiliate/v2/stats";
const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImM5ODliMzRhLTdjYmEtNGRlOC1iNzJiLWMzNTdkZDkxMTIxOSIsIm5vbmNlIjoiODZlOWU1NzctZjcwZS00MDhmLWFjNjUtYzAxZDAyODU3NjA4Iiwic2VydmljZSI6ImFmZmlsaWF0ZVN0YXRzIiwiaWF0IjoxNzQ2MDUyMjU1fQ.Bl4tRouCTt1Xizyq6NY3WbXjtAyVnshBP9i8Yr36KS4";

let leaderboardCache = [];

// Format username (e.g., azisai205 → az***05)
const formatUsername = (username) => {
    const firstTwo = username.slice(0, 2);
    const lastTwo = username.slice(-2);
    return `${firstTwo}***${lastTwo}`;
};

// Fetch and process leaderboard data
async function fetchLeaderboardData() {
    try {
        const now = new Date();
        const nowUTC = new Date(now.getTime() + now.getTimezoneOffset() * 60000);
        const year = nowUTC.getUTCFullYear();
        const month = nowUTC.getUTCMonth();

        const startDateObj = new Date(Date.UTC(year, month, 1, 0, 0, 0));
        const endDateObj = new Date(Date.UTC(year, month + 1, 0, 23, 59, 0));

        const startDate = startDateObj.toISOString();
        const endDate = endDateObj.toISOString();

        const response = await axios.get(apiUrl, {
            headers: {
                Authorization: `Bearer ${apiKey}`,
            },
            params: {
                userId: "c989b34a-7cba-4de8-b72b-c357dd911219",
                startDate,
                endDate,
            },
        });

        const data = response.data;

        leaderboardCache = data
            .filter((player) => player.username !== "azisai205")
            .sort((a, b) => b.weightedWagered - a.weightedWagered)
            .slice(0, 100000)
            .map((player) => ({
                username: formatUsername(player.username),
                wagered: Math.round(player.weightedWagered),
                weightedWager: Math.round(player.weightedWagered),
            }));

        console.log("Leaderboard updated:", leaderboardCache);
    } catch (error) {
        console.error("Error fetching leaderboard data:", error.message);
    }
}

// Routes
app.get("/", (req, res) => {
    res.send("Welcome to the Leaderboard API. Access /leaderboard or /leaderboard/top14");
});

app.get("/leaderboard", (req, res) => {
    res.json(leaderboardCache);
});

app.get("/leaderboard/top14", (req, res) => {
    const top14 = leaderboardCache.slice(0, 10);

    // Swap 1st and 2nd
    if (top14.length >= 2) {
        [top14[0], top14[1]] = [top14[1], top14[0]];
    }

    res.json(top14);
});
app.get("/leaderboard/prev", async (req, res) => {
    try {
        const now = new Date();
        const prevMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
        const prevMonthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 0));

        const startDate = prevMonth.toISOString();
        const endDate = prevMonthEnd.toISOString();

        const response = await axios.get(apiUrl, {
            headers: {
                Authorization: `Bearer ${apiKey}`,
            },
            params: {
                userId: "c989b34a-7cba-4de8-b72b-c357dd911219",
                startDate,
                endDate,
            },
        });

        const data = response.data;

        const top14 = data
            .filter((player) => player.username !== "azisai205")
            .sort((a, b) => b.weightedWagered - a.weightedWagered)
            .slice(0, 10);

        if (top14.length >= 2) {
            [top14[0], top14[1]] = [top14[1], top14[0]];
        }

        const processed = top14.map((player) => ({
            username: formatUsername(player.username),
            wagered: Math.round(player.weightedWagered),
            weightedWager: Math.round(player.weightedWagered),
        }));

        res.json(processed);
    } catch (error) {
        console.error("Error fetching previous leaderboard data:", error.message);
        res.status(500).json({ error: "Failed to fetch previous leaderboard" });
    }
});

// Initial fetch and set interval
fetchLeaderboardData();
setInterval(fetchLeaderboardData, 5 * 60 * 1000);

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});

// Self-ping to stay alive
setInterval(() => {
    axios.get("https://bluejuuldata.onrender.com/leaderboard/top14")
        .then(() => console.log("Self-ping successful."))
        .catch((err) => console.error("Self-ping failed:", err.message));
}, 4 * 60 * 1000);
