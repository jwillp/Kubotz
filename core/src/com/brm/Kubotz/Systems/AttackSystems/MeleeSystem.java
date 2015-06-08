package com.brm.Kubotz.Systems.AttackSystems;

import com.badlogic.gdx.math.Vector2;
import com.badlogic.gdx.physics.box2d.CircleShape;
import com.badlogic.gdx.physics.box2d.Fixture;
import com.badlogic.gdx.physics.box2d.FixtureDef;
import com.brm.GoatEngine.ECS.core.Entity.Entity;
import com.brm.GoatEngine.ECS.core.Entity.Event;
import com.brm.GoatEngine.ECS.core.Systems.EntitySystem;
import com.brm.GoatEngine.ECS.utils.Components.PhysicsComponent;
import com.brm.GoatEngine.Input.VirtualGamePad;
import com.brm.Kubotz.Components.MeleeComponent;
import com.brm.Kubotz.Config;
import com.brm.Kubotz.Constants;
import com.brm.Kubotz.Events.CollisionEvent;
import com.brm.Kubotz.Events.TakeDamageEvent;
import com.brm.Kubotz.Hitbox.Hitbox;
import com.brm.Kubotz.Input.GameButton;

/**
 * Used to handle the entities punching
 */
public class MeleeSystem extends EntitySystem{

    public MeleeSystem() {
    }

    @Override
    public void init(){}


    @Override
    public void handleInput() {
        for(Entity entity: getEntityManager().getEntitiesWithComponentEnabled(MeleeComponent.ID)) {
            if(entity.hasComponentEnabled(VirtualGamePad.ID)) {
                handleInputForEntity(entity);
            }
        }
    }


    private void handleInputForEntity(Entity entity){
        VirtualGamePad gamePad = (VirtualGamePad) entity.getComponent(VirtualGamePad.ID);
        MeleeComponent meleeComponent = (MeleeComponent)entity.getComponent(MeleeComponent.ID);
        PhysicsComponent phys = (PhysicsComponent)entity.getComponent(PhysicsComponent.ID);

        //Triggers the punch
        if(gamePad.isButtonPressed(GameButton.BUTTON_A)){
            if(meleeComponent.getCooldown().isDone() && meleeComponent.getDurationTimer().isDone()){
                meleeComponent.getDurationTimer().reset();
                createAttackBox(phys);
                // TODO FIRE EVENT FOR PUNCHING
            }
        }
    }


    public void update(float dt) {
        // See if punch duration is over

        for(Entity entity: getEntityManager().getEntitiesWithComponentEnabled(MeleeComponent.ID)){
            MeleeComponent meleeComponent = (MeleeComponent)entity.getComponent(MeleeComponent.ID);
            //Check if the punch duration is over, if so hide the punch
            if(meleeComponent.getDurationTimer().isDone()){
                meleeComponent.getCooldown().reset();
                removeAttackBox((PhysicsComponent) entity.getComponent(PhysicsComponent.ID));
            }
        }
    }




    /**
     * Creates an attack box for the melee attack
     * @param phys
     */
    private void createAttackBox(PhysicsComponent phys){
        CircleShape shape = new CircleShape();
        shape.setRadius(phys.getWidth() * 0.5f);

        Vector2 position = null;
        switch (phys.getDirection()) {
            case RIGHT:
                position = new Vector2(phys.getWidth() + phys.getWidth()/2, 0);
                break;
            case LEFT:
                position = new Vector2(-phys.getWidth()-phys.getWidth()/2, 0);
                break;
        }
        shape.setPosition(position);

        FixtureDef punchFixture = new FixtureDef();
        punchFixture.isSensor = true;
        punchFixture.shape = shape;

        Hitbox hitbox = new Hitbox(Hitbox.Type.Offensive, Constants.HITBOX_LABEL_MELEE);
        hitbox.damage = Config.PUNCH_DAMAGE;


        phys.getBody().createFixture(punchFixture).setUserData(hitbox);
        shape.dispose();

    }

    /**
     * Removes the attack box
     * @param phys
     */
    public void removeAttackBox(PhysicsComponent phys){
        for(int i=0; i<phys.getBody().getFixtureList().size ;i++){
            Fixture fixture = phys.getBody().getFixtureList().get(i);
            Hitbox hitbox = (Hitbox) fixture.getUserData();
            if(hitbox.label.equals(Constants.HITBOX_LABEL_MELEE)) {
                phys.getBody().destroyFixture(fixture);
            }
        }
    }












}

