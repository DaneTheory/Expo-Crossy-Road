import { GLView } from 'expo-gl';
import React, { Component } from 'react';
import {
  Animated,
  Dimensions,
  StyleSheet,
  Vibration,
  View,
} from 'react-native';

import GestureRecognizer, { swipeDirections } from '../components/GestureView';
import Score from '../components/ScoreText';
import Engine from '../src/GameEngine';
import State from '../state';
import GameOverScreen from './GameOverScreen';
import HomeScreen from './HomeScreen';

const DEBUG_CAMERA_CONTROLS = false;

class Game extends Component {
  /// Reserve State for UI related updates...
  state = {
    ready: false,
    score: 0,
    viewKey: 0,
    gameState: State.Game.none,
    // gameState: State.Game.gameOver
  };

  transitionScreensValue = new Animated.Value(1);

  componentWillReceiveProps(nextProps, nextState) {
    if (nextState.gameState !== this.state.gameState) {
      this.updateWithGameState(nextState.gameState, this.state.gameState);
    }
    // if (nextProps.character.id !== this.props.character.id) {
    //   (async () => {
    //     this.world.remove(this._hero);
    //     this._hero = this.hero.getNode(nextProps.character.id);
    //     this.world.add(this._hero);
    //     this._hero.position.set(0, groundLevel, startingRow);
    //     this._hero.scale.set(1, 1, 1);
    //     this.init();
    //   })();
    // }
  }

  transitionToGamePlayingState = () => {
    Animated.timing(this.transitionScreensValue, {
      toValue: 0,
      duration: 200,
      onComplete: ({ finished }) => {
        this.engine.setupGame();
        this.engine.init();

        if (finished) {
          Animated.timing(this.transitionScreensValue, {
            toValue: 1,
            duration: 300,
          }).start();
        }
      },
    }).start();
  };

  updateWithGameState = (gameState, previousGameState) => {
    if (gameState === this.state.gameState) {
      return;
    }
    const lastState = this.state.gameState;

    this.setState({ gameState });
    this.engine.gameState = gameState;
    const { playing, gameOver, paused, none } = State.Game;
    switch (gameState) {
      case playing:
        if (lastState !== none) {
          this.transitionToGamePlayingState();
        } else {
          // Coming straight from the menu.
          this.engine._hero.stopIdle();
          this.onSwipe(swipeDirections.SWIPE_UP);
        }

        break;
      case gameOver:
        break;
      case paused:
        break;
      case none:
        this.newScore();

        break;
      default:
        break;
    }
  };

  async componentDidMount() {
    // AudioManager.sounds.bg_music.setVolumeAsync(0.05);
    // await AudioManager.playAsync(
    //   AudioManager.sounds.bg_music, true
    // );

    Dimensions.addEventListener('change', this.onScreenResize);
  }

  onScreenResize = ({ window }) => {
    this.engine.updateScale();
  };

  componentWillUnmount() {
    Dimensions.removeEventListener('change', this.onScreenResize);
  }

  componentWillMount() {
    this.engine = new Engine();
    this.engine.hideShadows = this.hideShadows;
    this.engine.onUpdateScore = position => {
      if (this.state.score < position) {
        this.setState({ score: position });
      }
    };
    this.engine.onGameInit = () => {
      this.setState({ score: 0 });
    };
    this.engine.isGameEnded = () => {
      return this.state.gameState !== State.Game.playing;
    };
    this.engine.onGameReady = () => this.setState({ ready: true });
    this.engine.onGameEnded = () => {
      setTimeout(() => {
        this.setState({ gameState: State.Game.gameOver });
      }, 300);
    };
    this.engine.setupGame();
    this.engine.init();
  }

  newScore = () => {
    Vibration.cancel();
    // this.props.setGameState(State.Game.playing);
    this.setState({ score: 0 });
    this.engine.init();
  };

  onSwipe = gestureName => this.engine.moveWithDirection(gestureName);

  renderGame = () => {
    if (!this.state.ready) return;

    return (
      <GestureView
        pointerEvents={DEBUG_CAMERA_CONTROLS ? 'none' : undefined}
        onStartGesture={this.engine.beginMoveWithDirection}
        onSwipe={this.onSwipe}
      >
        <GLView
          style={{ flex: 1, height: '100%', overflow: 'hidden' }}
          onContextCreate={this.engine._onGLContextCreate}
        />
      </GestureView>
    );
  };

  renderGameOver = () => {
    if (this.state.gameState !== State.Game.gameOver) {
      return null;
    }

    return (
      <View style={StyleSheet.absoluteFillObject}>
        <GameOverScreen
          onRestart={() => {
            this.updateWithGameState(State.Game.playing);
          }}
        />
      </View>
    );
  };

  renderHomeScreen = () => {
    if (this.state.gameState !== State.Game.none) {
      return null;
    }

    return (
      <View style={StyleSheet.absoluteFillObject}>
        <HomeScreen
          onPlay={() => {
            this.updateWithGameState(State.Game.playing);
          }}
        />
      </View>
    );
  };

  render() {
    return (
      <View
        pointerEvents="box-none"
        style={[
          StyleSheet.absoluteFill,
          { flex: 1, position: 'fixed', backgroundColor: '#6dceea' },
          this.props.style,
        ]}
      >
        <Animated.View
          style={{ flex: 1, opacity: this.transitionScreensValue }}
        >
          {this.renderGame()}
        </Animated.View>
        <Score
          score={this.state.score}
          gameOver={this.state.gameState === State.Game.gameOver}
        />
        {this.renderGameOver()}

        {this.renderHomeScreen()}
      </View>
    );
  }
}

const GestureView = ({ onStartGesture, onSwipe, ...props }) => {
  const config = {
    velocityThreshold: 0.2,
    directionalOffsetThreshold: 80,
  };

  return (
    <GestureRecognizer
      onResponderGrant={() => {
        onStartGesture();
      }}
      onSwipe={direction => {
        onSwipe(direction);
      }}
      config={config}
      onTap={() => {
        onSwipe(swipeDirections.SWIPE_UP);
      }}
      style={{ flex: 1 }}
      {...props}
    />
  );
};

export default Game;
