package com.brm.Kubotz.Features.GameRules.Components;

import com.brm.GoatEngine.ECS.core.EntityComponent;

/**
 * A Component used to store the scores of a player
 * and some other useful information
 * like player Id ==> player1, player2 CPU
 */
public class PlayerScoreComponent extends EntityComponent {

    public final static String ID = "PLAYER_SCORE_COMPONENT";

    public final static int PLAYER_CPU = 0;
    public final static int PLAYER_1 = 1;
    public final static int PLAYER_2 = 2;


    private int playerId = 0;      // 0 means CPU, 1 means player1 and 2 means player 2

    private int nbKills = 0;

    private int nbLives = 3; //The number of lives i.e. the max nb of times the player can die


    public PlayerScoreComponent(int playerId){
        this.playerId = playerId;
    }



    public int getNbKills() {
        return nbKills;
    }

    public void addKills(int nbKills) {
        this.nbKills += nbKills;
    }



    /**
     * nbLives - nbDeath
     * @param nbDeath
     */
    public void addDeath(int nbDeath) {
        this.nbLives -= nbDeath;
    }

    public int getNbLives() {
        return nbLives;
    }

    public int getPlayerId() {
        return playerId;
    }

    public void setPlayerId(int playerId) {
        this.playerId = playerId;
    }
}
