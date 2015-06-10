package com.brm.Kubotz.Systems.GameRules;

import com.brm.GoatEngine.ECS.core.Systems.EntitySystem;

/**
 * Used for the game rules. It is a Global system with the
 * reponsibility of executing the appropriate Game Rule subsystem
 * according to the player's previous choices
 */
public class GameRulesSystem extends EntitySystem {

    public EntitySystem activeRuleSystem;   // The active game rule chosen by the player


    /**
     * Used to initialise the system
     */
    @Override
    public void init(){}

    /**
     * Called once per game frame
     *
     * @param dt
     */
    @Override
    public void update(float dt) {



    }










}

