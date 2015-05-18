package com.brm.Kubotz.Systems.AttackSystems;

import com.brm.GoatEngine.ECS.Entity.EntityManager;
import com.brm.GoatEngine.ECS.Systems.EntitySystem;

/**
 * Global systems for sub systems of attacks
 */
public class AttackSystem extends EntitySystem {

    public AttackSystem(EntityManager em) {
        super(em);




    }

    @Override
    public void init() {
        this.getSystemManager().addSystem(PunchSystem.class, new PunchSystem(em));
        this.getSystemManager().addSystem(LaserSwordSystem.class, new LaserSwordSystem(em));
        this.getSystemManager().addSystem(GunsSystem.class, new GunsSystem(em));
        this.getSystemManager().addSystem(DroneGauntletSystem.class, new DroneGauntletSystem(em));
    }

    @Override
    public void handleInput() {
        this.getSystemManager().getSystem(DroneGauntletSystem.class).handleInput();
        this.getSystemManager().getSystem(PunchSystem.class).handleInput();
        this.getSystemManager().getSystem(LaserSwordSystem.class).handleInput();
        this.getSystemManager().getSystem(GunsSystem.class).handleInput();

    }


    @Override
    public void update(float dt) {
        this.getSystemManager().getSystem(DroneGauntletSystem.class).update(dt);
        this.getSystemManager().getSystem(PunchSystem.class).update(dt);
        this.getSystemManager().getSystem(LaserSwordSystem.class).update(dt);
        this.getSystemManager().getSystem(GunsSystem.class).update(dt);

    }





}
