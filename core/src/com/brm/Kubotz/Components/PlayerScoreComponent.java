package com.brm.Kubotz.Components;

import com.brm.GoatEngine.ECS.Components.EntityComponent;

/**
 * A Component used to store the scores of a player
 */
public class PlayerScoreComponent extends EntityComponent {

    public final static String ID = "PLAYER_SCORE_COMPONENT";

    private int nbKills = 0;
    private int nbDeath = 0;

    private int nbLives = 3; //The number of lives i.e. the max nb of times the player can die

    public int getNbKills() {
        return nbKills;
    }

    public void addKills(int nbKills) {
        this.nbKills += nbKills;
    }


    public int getNbDeath() {
        return nbDeath;
    }

    public void addDeath(int nbDeath) {
        this.nbDeath += nbDeath;
    }
}
