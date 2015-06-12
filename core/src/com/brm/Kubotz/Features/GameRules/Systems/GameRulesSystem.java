package com.brm.Kubotz.Features.GameRules.Systems;

import com.brm.GoatEngine.ECS.core.Systems.EntitySystem;

/**
 * Used for the game rules. It is a Global system with the
 * reponsibility of executing the appropriate Game Rule subsystem
 * according to the player's previous choices
 */
public class GameRulesSystem extends EntitySystem {

    private EntitySystem activeRuleSystem;   // The active game rule chosen by the player


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

        this.activeRuleSystem.update(dt);

    }


    public EntitySystem getActiveRuleSystem() {
        return activeRuleSystem;
    }

    public <T extends EntitySystem> void setActiveRuleSystem(Class<T> className, EntitySystem activeRuleSystem) {
        this.activeRuleSystem = activeRuleSystem;
        this.getSystemManager().addSystem(className, activeRuleSystem);
    }
}
