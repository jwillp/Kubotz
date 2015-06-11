package com.brm.Kubotz.Features.PowerUps.Systems;

import com.badlogic.gdx.math.MathUtils;
import com.badlogic.gdx.math.Vector2;
import com.brm.GoatEngine.ECS.core.Components.EntityComponent;
import com.brm.GoatEngine.ECS.core.Entity.Entity;
import com.brm.GoatEngine.ECS.core.Systems.EntitySystem;
import com.brm.GoatEngine.Utils.Timer;
import com.brm.Kubotz.Features.PowerUps.PowerUp;
import com.brm.Kubotz.Features.PowerUps.Components.PowerUpComponent;
import com.brm.Kubotz.Features.PowerUps.PowerUpEffect;
import com.brm.Kubotz.Features.PowerUps.Components.PowerUpsContainerComponent;
import com.brm.Kubotz.Features.Respawn.Components.SpawnPointComponent;
import com.brm.Kubotz.Constants;
import com.brm.Kubotz.Features.PowerUps.Entities.PowerUpFactory;
import com.brm.Kubotz.Common.Systems.PhysicsSystem;

import java.util.ArrayList;

/**
 * Processes the PowerUps of all the entities
 * It is also responsible of spawning Bonus Objects
 * randomly
 */
public class PowerUpsSystem extends EntitySystem {

    private Timer spawnTimer; //Timer responsible to determine whether or not we should spawn a new power up

    public PowerUpsSystem() {
        int delay = MathUtils.random(Constants.MIN_DELAY_BONUS_SPAWN, Constants.MAX_DELAY_BONUS_SPAWN);
        spawnTimer = new Timer(delay);
        spawnTimer.start();
    }


    @Override
    public void init() {}


    @Override
    public void update(float dt){
        updatePowerUps();
        updateSpawns();
    }


    /**
     * Terminates all PowerUps if needed
     */
    private void updatePowerUps(){
        for(Entity entity: getEntityManager().getEntitiesWithComponent(PowerUpsContainerComponent.ID)){
            PowerUpsContainerComponent container;
            container = (PowerUpsContainerComponent) entity.getComponent(PowerUpsContainerComponent.ID);
            ArrayList<PowerUp> powerUps = container.getPowerUps();
            for (int i = 0; i < powerUps.size(); i++) {
                PowerUp powerUp = powerUps.get(i);
                if (powerUp.getEffectDuration().isDone()) {
                    powerUp.getEffect().onFinish(entity);
                    container.removePowerUp(powerUp);
                }
            }
        }
    }

    /**
     * Checks if a new Bonus needs to be spawn
     * if so spawns one
     */
    private void updateSpawns(){
        if(this.spawnTimer.isDone()){
            this.spawnTimer.setDelay(MathUtils.random(Constants.MIN_DELAY_BONUS_SPAWN, Constants.MAX_DELAY_BONUS_SPAWN));
            if(getEntityManager().getEntitiesWithComponent(PowerUpComponent.ID).size() < Constants.MAX_NB_BONUS){
                this.spawnPowerUp();
            }
            this.spawnTimer.reset();
        }
    }


    /**
     * Spawns a new PowerUp
     */
    private void spawnPowerUp(){


        //Get PowerUps Spawns
        ArrayList<EntityComponent> spawns = getEntityManager().getComponents(SpawnPointComponent.ID);
        for (int i = 0; i < spawns.size(); i++) {
            if (((SpawnPointComponent) spawns.get(i)).getType() != SpawnPointComponent.Type.PowerUp) {
                spawns.remove(i);
            }
        }

        //Get a Random Spawn Point
        int index = MathUtils.random(spawns.size()-1);
        Entity entity = getEntityManager().getEntitiesWithComponent(SpawnPointComponent.ID).get(index);
        SpawnPointComponent spawn = (SpawnPointComponent)entity.getComponent(SpawnPointComponent.ID);

        //Randomize position
        Vector2 pos = spawn.getPosition();
        pos.x = MathUtils.random(pos.x-0.1f, pos.x+0.1f);
        pos.y = MathUtils.random(pos.y-0.1f, pos.y+0.1f);


        // Make a random PowerUp
        new PowerUpFactory(getEntityManager(), this.getSystemManager().getSystem(PhysicsSystem.class).getWorld())
            .withEffect(getRandomEffect())
            .withDuration(Timer.TEN_SECONDS * 3)
            .withLifeTime(Timer.TEN_SECONDS * 2)
            .withPosition(pos)
            .build();
    }


    /**
     * Chosses a random PowerUpEffect and returns it
     * @return
     */
    private PowerUpEffect getRandomEffect(){
        PowerUpEffect effect = null;

        int rand = MathUtils.random(1,9);
        if (rand == 1) {
            effect = new PowerUpEffect.LaserGunMkIProvider();

        } else if (rand == 2) {
            effect = new PowerUpEffect.HealthModifier();

        } else if (rand == 3) {
            effect = new PowerUpEffect.EnergyModifier();

        } else if (rand == 4) {
            effect = new PowerUpEffect.EnergyModifier();

        } else if (rand == 5) {
            effect = new PowerUpEffect.JumpModifier();

        } else if (rand == 6) {
            effect = new PowerUpEffect.LaserGunMkIProvider();

        } else if (rand == 7) {
            effect = new PowerUpEffect.LaserSwordProvider();

        } else if (rand == 8) {
            effect = new PowerUpEffect.InvincibilityProvider();

        } else if (rand == 9) {
            effect = new PowerUpEffect.ShieldProvider();
        }


        return effect;
    }





}
