package com.brm.Kubotz.Common.Systems.AttackSystems;

import com.brm.GoatEngine.ECS.core.EntitySystem;
import com.brm.Kubotz.Features.LaserGuns.Systems.GunsSystem;
import com.brm.Kubotz.Features.LaserSword.Systems.LaserSwordSystem;
import com.brm.Kubotz.Features.MeleeAttacks.Systems.MeleeSystem;

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
