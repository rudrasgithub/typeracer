# 🏁 TypeRacer - Real-Time Multiplayer Typing Game

A full-stack MERN application where multiple users compete in real-time typing races. Features smooth animations, live race tracking, global leaderboards, and comprehensive user statistics.

## ✨ Features

### Core Features
- 🎮 **Real-Time Multiplayer Racing** - Compete with up to 4 players simultaneously
- ⚡ **Live Race Updates** - Socket.io powered real-time synchronization
- 🏆 **Global Leaderboards** - Multiple ranking systems (Overall, WPM, Wins)
- 📊 **Comprehensive Stats** - Track WPM, accuracy, race history, and progress
- 🎯 **Visual Race Representation** - Smooth animations with racing cars
- ⭐ **Level & XP System** - Gain experience and level up as you race
- 🔐 **Authentication** - Secure user registration and login with JWT
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile devices

### Additional Features
- Auto-matching system for finding opponents
- Countdown timer before race start
- Real-time typing accuracy tracking
- Error counting and correction highlighting
- Race history with detailed statistics
- User profiles with achievement tracking
- Smooth UI animations and transitions
- Multiple leaderboard categories

## 🛠️ Tech Stack

### Frontend
- **React** - UI library
- **Vite** - Build tool and dev server
- **Redux Toolkit** - State management
- **React Router** - Navigation
- **Socket.io Client** - Real-time communication
- **Axios** - HTTP requests
- **CSS3** - Styling with animations

### Backend
- **Node.js** - Runtime environment
- **Express** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **Socket.io** - Real-time bidirectional communication
- **JWT** - Authentication
- **Bcrypt** - Password hashing

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v14 or higher)
- **MongoDB** (v4.4 or higher)
- **npm** or **yarn**

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd typeracer
```

### 2. Install Root Dependencies
```bash
npm install
```

### 3. Setup Backend

```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env file with your configuration
# Required variables:
# - PORT=5000
# - MONGODB_URI=mongodb://localhost:27017/typeracer
# - JWT_SECRET=your_secret_key
# - CLIENT_URL=http://localhost:3000
```

### 4. Setup Frontend

```bash
# Navigate to client directory
cd ../client

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env file (optional, defaults are set)
# - VITE_API_URL=http://localhost:5000
# - VITE_SOCKET_URL=http://localhost:5000
```

### 5. Start MongoDB

Make sure MongoDB is running on your system:

```bash
# Linux/Mac
sudo systemctl start mongod

# Or using mongod directly
mongod --dbpath /path/to/data/directory
```

### 6. Run the Application

#### Option 1: Run Both Frontend and Backend Together (Recommended)
```bash
# From root directory
npm run dev
```

#### Option 2: Run Separately

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd client
npm run dev
```

The application will be available at:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000

## 📖 Usage

### Getting Started
1. **Register** - Create a new account at `/register`
2. **Login** - Sign in to your account at `/login`
3. **Find Match** - Navigate to `/race` and click "Find Match"
4. **Wait for Players** - System auto-matches you with 2-4 players
5. **Race!** - Type the displayed text as fast and accurately as possible
6. **View Results** - See your ranking, WPM, and accuracy after the race
7. **Check Leaderboard** - Visit `/leaderboard` to see global rankings

### Features Guide

#### Racing
- Click "Find Match" to join the waiting queue
- Race starts automatically when 2-4 players are matched
- 3-second countdown before race begins
- Type the text exactly as shown
- Green text = correct, Red text = incorrect
- Real-time progress bars show all players' positions
- First to finish wins!

#### Statistics
- **WPM (Words Per Minute)** - Typing speed metric
- **Accuracy** - Percentage of correct characters typed
- **Level** - Increases every 100 XP gained
- **Experience** - Earned based on performance in races

#### Leaderboards
- **Global** - Overall score based on WPM, accuracy, and wins
- **Highest WPM** - Best single-race typing speed
- **Most Wins** - Total first-place finishes

## 🏗️ Project Structure

```
typeracer/
├── client/                    # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/       # Reusable components
│   │   │   └── Navbar.js
│   │   ├── pages/            # Page components
│   │   │   ├── Home.js
│   │   │   ├── Race.js
│   │   │   ├── Leaderboard.js
│   │   │   ├── Profile.js
│   │   │   ├── Login.js
│   │   │   └── Register.js
│   │   ├── store/            # Redux store
│   │   │   ├── store.js
│   │   │   └── slices/
│   │   │       ├── authSlice.js
│   │   │       ├── raceSlice.js
│   │   │       └── leaderboardSlice.js
│   │   ├── services/         # API services
│   │   │   └── socketService.js
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
│
├── server/                    # Express backend
│   ├── models/               # Mongoose models
│   │   ├── User.js
│   │   ├── Race.js
│   │   └── Leaderboard.js
│   ├── routes/               # API routes
│   │   ├── auth.js
│   │   ├── race.js
│   │   ├── leaderboard.js
│   │   └── user.js
│   ├── middleware/           # Custom middleware
│   │   └── auth.js
│   ├── server.js             # Main server file
│   └── package.json
│
├── package.json              # Root package.json
└── README.md
```

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/typeracer
JWT_SECRET=your_jwt_secret_key_here
NODE_ENV=development
CLIENT_URL=http://localhost:3000
```

#### Frontend (.env)
```env
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

## 🎮 Game Mechanics

### Race Flow
1. Player joins waiting room
2. System matches 2-4 players (auto-starts at 2+ players)
3. All players see race text and opponents
4. 3-second countdown
5. Race begins - players type the displayed text
6. Real-time progress updates via Socket.io
7. First player to complete text wins
8. Results displayed with rankings
9. Stats updated in database

### Scoring System
- **WPM Calculation**: `(words typed / time elapsed in minutes)`
- **Accuracy**: `(correct characters / total characters) * 100`
- **Experience**: `WPM + (Accuracy / 2) + (100 for win or 50 for participation)`
- **Leaderboard Score**: `(Average WPM * 2) + Average Accuracy + (Total Wins * 50)`

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout user

### Race
- `POST /api/race/save` - Save race results
- `GET /api/race/history` - Get user's race history
- `GET /api/race/:raceId` - Get specific race details

### Leaderboard
- `GET /api/leaderboard/global` - Get global leaderboard
- `GET /api/leaderboard/wpm` - Get WPM leaderboard
- `GET /api/leaderboard/wins` - Get wins leaderboard
- `GET /api/leaderboard/rank/me` - Get user's rank

### User
- `GET /api/user/profile/:username` - Get user profile
- `PUT /api/user/profile` - Update user profile
- `GET /api/user/stats` - Get user statistics

## 🌐 Socket Events

### Client → Server
- `joinWaitingRoom` - Join waiting queue
- `leaveWaitingRoom` - Leave waiting queue
- `updateProgress` - Send typing progress

### Server → Client
- `waitingForPlayers` - Waiting queue status
- `raceReady` - Race about to start
- `countdown` - Countdown timer
- `raceStart` - Race begins
- `progressUpdate` - Player progress updates
- `playerFinished` - Player completed race
- `raceFinished` - Race ended with results
- `playerDisconnected` - Player left race

## 🎨 Styling & Animations

The application features:
- Smooth gradient backgrounds
- Fade-in animations for page transitions
- Pulse animations for call-to-action buttons
- Slide-in animations for race cars
- Responsive design for all screen sizes
- Custom color schemes for different states
- Interactive hover effects

## 🔒 Security Features

- Password hashing with bcryptjs
- JWT token authentication
- HTTP-only cookies
- Input validation and sanitization
- CORS configuration
- Protected API routes
- SQL injection prevention via Mongoose

## 🐛 Troubleshooting

### Common Issues

**MongoDB Connection Error:**
```bash
# Make sure MongoDB is running
sudo systemctl start mongod
# Or check if running on correct port
mongo --port 27017
```

**Port Already in Use:**
```bash
# Find process using port
lsof -i :5000
# Kill the process
kill -9 <PID>
```

**Socket.io Connection Issues:**
- Check if both frontend and backend URLs are correct in .env files
- Ensure firewall isn't blocking WebSocket connections
- Verify CORS settings in server.js

## 📝 Future Enhancements

- [ ] Private race rooms with invite codes
- [ ] Custom text selection for races
- [ ] Practice mode for solo typing
- [ ] Achievement badges system
- [ ] Friend system and challenges
- [ ] Race replays
- [ ] Mobile app versions
- [ ] Tournament system
- [ ] Typing tutorials
- [ ] Multiple language support

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 👏 Acknowledgments

- Socket.io for real-time communication
- MongoDB for flexible data storage
- React and Redux teams for excellent documentation
- The typing community for inspiration

## 📧 Contact

For questions or feedback, please open an issue in the repository.

---

**Happy Racing! 🏁⚡**
