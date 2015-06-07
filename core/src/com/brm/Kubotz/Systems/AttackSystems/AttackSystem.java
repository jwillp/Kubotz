package com.brm.Kubotz.Systems.AttackSystems;

import com.brm.GoatEngine.ECS.core.Systems.EntitySystem;

/**
 * Global systems for sub systems of attacks
 */
public class AttackSystem extends EntitySystem {

    public AttackSystem(){}

    @Override
    public void init() {
        this.getSystemManager().addSystem(MeleeSystem.class, new MeleeSystem());
        this.getSystemManager().addSystem(LaserSwordSystem.class, new LaserSwordSystem());
        this.getSystemManager().addSystem(GunsSystem.class, new GunsSystem());
    }

    @Override
    public void handleInput() {
        this.getSystemManager().getSystem(MeleeSystem.class).handleInput();
        this.getSystemManager().getSystem(LaserSwordSystem.class).handleInput();
        this.getSystemManager().getSystem(GunsSystem.class).handleInput();
    }


    @Override
    public void update(float dt) {
        this.getSystemManager().getSystem(MeleeSystem.class).update(dt);
        this.getSystemManager().getSystem(LaserSwordSystem.class).update(dt);
        this.getSystemManager().getSystem(GunsSystem.class).update(dt);
    }





}
