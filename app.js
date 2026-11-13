const { useEffect, useRef, useState } = React;

function Game() {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const keysRef = useRef({});
  const gameRef = useRef(createInitialGameState());
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === " ") {
        event.preventDefault();
        keysRef.current.space = true;
      } else {
        keysRef.current[event.key] = true;
      }
    };

    const handleKeyUp = (event) => {
      if (event.key === " ") {
        keysRef.current.space = false;
      } else {
        keysRef.current[event.key] = false;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    canvas.width = 500;
    canvas.height = 600;

    let lastFrameTime = 0;

    function spawnEnemy() {
      const x = Math.random() * (canvas.width - 40) + 20;
      const speed = 1.6 + level * 0.35 + Math.random() * 0.8;
      const size = 28 + Math.random() * 12;
      gameRef.current.enemies.push({ x, y: -size, width: size, height: size * 0.75, speed });
    }

    function resetGame() {
      gameRef.current = createInitialGameState();
      setScore(0);
      setLives(3);
      setLevel(1);
      setPlaying(true);
    }

    function drawShip(ship) {
      context.fillStyle = "#52d2ff";
      context.beginPath();
      context.moveTo(ship.x, ship.y);
      context.lineTo(ship.x - ship.width / 2, ship.y + ship.height);
      context.lineTo(ship.x + ship.width / 2, ship.y + ship.height);
      context.closePath();
      context.fill();
    }

    function drawBullet(bullet) {
      context.fillStyle = "#ffffff";
      context.fillRect(bullet.x - 2, bullet.y - 10, 4, 10);
    }

    function drawEnemy(enemy) {
      context.fillStyle = "#ff7a72";
      context.fillRect(enemy.x - enemy.width / 2, enemy.y, enemy.width, enemy.height);
    }

    function collide(a, b) {
      return (
        a.x + a.width / 2 > b.x - b.width / 2 &&
        a.x - a.width / 2 < b.x + b.width / 2 &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
      );
    }

    function update(delta) {
      const state = gameRef.current;
      const ship = state.ship;

      if (keysRef.current.ArrowLeft || keysRef.current.a || keysRef.current.A) {
        ship.x -= ship.speed;
      }
      if (keysRef.current.ArrowRight || keysRef.current.d || keysRef.current.D) {
        ship.x += ship.speed;
      }
      ship.x = Math.max(ship.width / 2, Math.min(canvas.width - ship.width / 2, ship.x));

      if (keysRef.current.space && state.lastFire > 18) {
        state.bullets.push({ x: ship.x, y: ship.y - 18, width: 4, height: 12, speed: 8 });
        state.lastFire = 0;
      }

      state.lastFire += delta;
      state.spawnTimer += delta;
      state.enemySpeed = 1.6 + level * 0.32;

      if (state.spawnTimer > Math.max(450 - level * 20, 160)) {
        spawnEnemy();
        state.spawnTimer = 0;
      }

      state.bullets = state.bullets.filter((bullet) => bullet.y + bullet.height > 0);
      state.bullets.forEach((bullet) => {
        bullet.y -= bullet.speed;
      });

      state.enemies = state.enemies.filter((enemy) => {
        enemy.y += enemy.speed;
        return enemy.y < canvas.height + enemy.height;
      });

      const remainingEnemies = [];
      state.enemies.forEach((enemy) => {
        let hit = false;
        state.bullets.forEach((bullet) => {
          if (!hit && collide({ x: bullet.x, y: bullet.y, width: 4, height: bullet.height }, enemy)) {
            hit = true;
            setScore((current) => current + 12);
            state.levelCount += 1;
          }
        });
        if (!hit) {
          remainingEnemies.push(enemy);
        }
      });

      state.enemies = remainingEnemies;

      state.enemies.forEach((enemy) => {
        if (collide({ x: ship.x, y: ship.y, width: ship.width, height: ship.height }, enemy)) {
          state.hitCooldown = 12;
          enemy.y = canvas.height + 100;
          setLives((current) => Math.max(0, current - 1));
        }
      });

      if (lives <= 0) {
        setPlaying(false);
      }

      if (state.levelCount >= 12) {
        state.levelCount = 0;
        setLevel((current) => current + 1);
      }

      drawGame();
    }

    function drawGame() {
      const state = gameRef.current;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "rgba(2, 11, 23, 0.45)";
      context.fillRect(0, 0, canvas.width, canvas.height);
      drawShip(state.ship);
      state.bullets.forEach(drawBullet);
      state.enemies.forEach(drawEnemy);
      context.fillStyle = "rgba(255, 255, 255, 0.08)";
      for (let i = 0; i < 15; i += 1) {
        context.fillRect((i * 36) % canvas.width, (i * 46) % canvas.height, 2, 2);
      }
    }

    function gameLoop(time) {
      if (!playing) {
        context.fillStyle = "rgba(0, 0, 0, 0.7)";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = "#f57878";
        context.font = "bold 34px Inter, sans-serif";
        context.textAlign = "center";
        context.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 12);
        context.fillStyle = "#ffffff";
        context.font = "18px Inter, sans-serif";
        context.fillText("Press Restart to play again", canvas.width / 2, canvas.height / 2 + 28);
        return;
      }

      const delta = Math.min(time - lastFrameTime, 50);
      lastFrameTime = time;
      update(delta);
      animationRef.current = window.requestAnimationFrame(gameLoop);
    }

    gameRef.current = createInitialGameState();
    animationRef.current = window.requestAnimationFrame((time) => {
      lastFrameTime = time;
      gameLoop(time);
    });

    return () => {
      window.cancelAnimationFrame(animationRef.current);
    };
  }, [playing, lives, level]);

  function restart() {
    gameRef.current = createInitialGameState();
    setScore(0);
    setLives(3);
    setLevel(1);
    setPlaying(true);
  }

  return (
    React.createElement("div", { className: "container" },
      React.createElement("div", { className: "hud" },
        React.createElement("div", null, React.createElement("strong", null, "Score"), React.createElement("div", null, score)),
        React.createElement("div", null, React.createElement("strong", null, "Lives"), React.createElement("div", null, lives)),
        React.createElement("div", null, React.createElement("strong", null, "Level"), React.createElement("div", null, level))
      ),
      React.createElement("canvas", { ref: canvasRef, className: "game-canvas" }),
      React.createElement("div", { className: "footer" }, "Move with Arrow/WASD, fire with Space."),
      !playing && React.createElement("button", { onClick: restart }, "Restart")
    )
  );
}

function createInitialGameState() {
  return {
    ship: { x: 250, y: 540, width: 44, height: 24, speed: 6 },
    bullets: [],
    enemies: [],
    lastFire: 20,
    spawnTimer: 0,
    enemySpeed: 2,
    hitCooldown: 0,
    levelCount: 0,
  };
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(React.createElement(Game));
