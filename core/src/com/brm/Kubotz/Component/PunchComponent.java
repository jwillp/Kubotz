package com.brm.Kubotz.Component;

import com.badlogic.gdx.math.Vector2;
import com.badlogic.gdx.physics.box2d.Body;
import com.badlogic.gdx.physics.box2d.CircleShape;
import com.badlogic.gdx.physics.box2d.Fixture;
import com.badlogic.gdx.physics.box2d.FixtureDef;
import com.brm.GoatEngine.ECS.Components.Component;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.Utils.Timer;
import com.brm.Kubotz.GameConstant;

/**
 * Component used to let an entity punch
 */
public class PunchComponent extends Component {

    public static final String ID = "PUNCH_COMPONENT";

    public int damage = 10; //Number of damage per hit

    public Timer durationTimer = new Timer(20); //The Duration of the hit
    public Timer cooldown = new Timer(80); //The delay between hits
    PhysicsComponent phys;

    public float radius = 0.2f;

    public Fixture punchFixture;

    /**
     *
     * @param phys : The physics component of the entity
     */
    public PunchComponent(PhysicsComponent phys){
       this.phys = phys;
        this.durationTimer.start();
        this.cooldown.start();
    }

    /**
     * Creates the attack box
     */
    public void showAttackBox(PhysicsComponent.Direction direction){
        //Create AttackBox
        FixtureDef fixtureDef;
        CircleShape circleShapeTop = new CircleShape();
        circleShapeTop.setRadius(phys.getWidth()*0.5f);
        Vector2 position = null;
        switch (direction) {
            case RIGHT:
                position = new Vector2(phys.getWidth() + phys.getWidth() * 0.5f, 0);
                break;
            case LEFT:
                position = new Vector2(-phys.getWidth()-phys.getWidth() * 0.5f, 0);
                break;
        }

        circleShapeTop.setPosition(position);
        fixtureDef = new FixtureDef();
        fixtureDef.shape = circleShapeTop;
        fixtureDef.density = 0.1f;
        this.punchFixture = this.phys.getBody().createFixture(fixtureDef);
        this.punchFixture.setUserData(GameConstant.FIXTURE_PUNCH_ATTACK);
        circleShapeTop.dispose();
    }






    /**
     * Removes the attackBox
     */
    public void hideAttackBox(){
        this.phys.getBody().destroyFixture(this.punchFixture);
        this.punchFixture = null;

    }


}
