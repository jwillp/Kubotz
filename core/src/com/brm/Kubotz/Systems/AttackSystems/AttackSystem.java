package com.brm.Kubotz.Systems.AttackSystems;

import com.brm.GoatEngine.ECS.Entity.EntityManager;
import com.brm.GoatEngine.ECS.Systems.EntitySystem;

/**
 * Global systems for sub systems of attacks
 */
public class AttackSystem extends EntitySystem {

    public AttackSystem(){}

    @Override
    public void init() {
        this.getSystemManager().addSystem(PunchSystem.class, new PunchSystem());
        this.getSystemManager().addSystem(LaserSwordSystem.class, new LaserSwordSystem());
        this.getSystemManager().addSystem(GunsSystem.class, new GunsSystem());
    }

    @Override
    public void handleInput() {
        this.getSystemManager().getSystem(PunchSystem.class).handleInput();
        this.getSystemManager().getSystem(LaserSwordSystem.class).handleInput();
        this.getSystemManager().getSystem(GunsSystem.class).handleInput();
    }


    @Override
    public void update(float dt) {
        this.getSystemManager().getSystem(PunchSystem.class).update(dt);
        this.getSystemManager().getSystem(LaserSwordSystem.class).update(dt);
        this.getSystemManager().getSystem(GunsSystem.class).update(dt);
    }





}
