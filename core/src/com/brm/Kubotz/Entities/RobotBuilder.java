package com.brm.Kubotz.Entities;

import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.math.Vector2;
import com.badlogic.gdx.physics.box2d.*;
import com.brm.GoatEngine.ECS.Components.JumpComponent;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Components.TagsComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Entity.EntityBuilder;
import com.brm.GoatEngine.ECS.EntityManager;
import com.brm.GoatEngine.Input.VirtualGamePad;
import com.brm.GoatEngine.Utils.Timer;
import com.brm.Kubotz.Component.AppearanceComponent;
import com.brm.Kubotz.Component.CameraTargetComponent;
import com.brm.Kubotz.Component.Skills.FlyComponent;

/**
 * Used to create block entities
 */
public class RobotBuilder extends EntityBuilder{

    private World world;
    private Vector2 position = new Vector2(0,0);
    private Vector2 size = new Vector2(0.5f, 0.5f);

    private boolean hasCamTargetComponent = false;

    public RobotBuilder(EntityManager entityManager, World world,  Vector2 position) {
        super(entityManager);
        this.world = world;
        this.position = position;
    }


    /**
     * Adds a camera targetComponent to the Robot
     * @return this for chaining
     */
    public RobotBuilder withCameraTargetComponent(){
        hasCamTargetComponent = true;
        return this;
    }


    /**
     * Defines the height of the Robot and the width ACCORDINGLY
     * @return this for chaining
     */
    public RobotBuilder withHeight(float height){

        this.size = new Vector2(height/2, height);
        return this;
    }

    /**
     * Defines the width of the Robot and the height ACCORDINGLY
     * @return this for chaining
     */
    public RobotBuilder withWidth(float width){
        this.size = new Vector2(width, width*2);
        return this;
    }





    @Override
    public Entity build() {
        Entity character = new Entity();
        entityManager.registerEntity(character);

        //Physics
        PhysicsComponent physics;
        physics = new PhysicsComponent(world, BodyDef.BodyType.DynamicBody, position.x,position.y, size.x, size.y);
        physics.getAcceleration().set(0.5f, 15.0f);

        physics.getBody().setFixedRotation(true);


        FixtureDef fixtureDef = new FixtureDef();


        // Circle 1
        CircleShape circleShapeTop = new CircleShape();
        circleShapeTop.setRadius(physics.getWidth());
        circleShapeTop.setPosition(new Vector2(0, size.y * 0.5f));
        fixtureDef = new FixtureDef();
        fixtureDef.shape = circleShapeTop;
        fixtureDef.density = 0.1f;
        physics.getBody().createFixture(fixtureDef);
        circleShapeTop.dispose();


        // Circle 2
        CircleShape circleShapeBottom = new CircleShape();
        circleShapeBottom.setRadius(physics.getWidth());
        circleShapeBottom.setPosition(new Vector2(0, -size.y * 0.5f));
        fixtureDef = new FixtureDef();
        fixtureDef.shape = circleShapeBottom;
        fixtureDef.density = 0.1f;
        physics.getBody().createFixture(fixtureDef);
        circleShapeBottom.dispose();

        ///MIDDLE
        PolygonShape polyShape = new PolygonShape();
        polyShape.setAsBox(physics.getWidth(), 0.5f*physics.getHeight());
        fixtureDef = new FixtureDef();
        fixtureDef.shape = polyShape;
        physics.getBody().createFixture(fixtureDef);
        polyShape.dispose();



        //foot fixture
        PolygonShape footSensor = new PolygonShape();
        footSensor.setAsBox(0.1f,0.1f, new Vector2(0, -size.y), 0);
        fixtureDef.isSensor = true;
        fixtureDef.shape = footSensor;
        physics.getBody().createFixture(fixtureDef).setUserData("footSensor");











        // Add user data to Body
        physics.getBody().setUserData(character);

        //Appearance
        AppearanceComponent appearance = new AppearanceComponent();
        appearance.setDebugColor(Color.GREEN);


        //Control
        VirtualGamePad gamePad = new VirtualGamePad(VirtualGamePad.InputSource.USER_INPUT);



        // Jump
        JumpComponent jp = new JumpComponent(3);

        // Flying Property
        FlyComponent fp = new FlyComponent(1000, Timer.INFINITE);

        character.addComponent(physics, PhysicsComponent.ID);
        character.addComponent(appearance, AppearanceComponent.ID);
        character.addComponent(jp, JumpComponent.ID);
        character.addComponent(fp, FlyComponent.ID);
        character.addComponent(gamePad, VirtualGamePad.ID);
        character.addComponent(new TagsComponent(), TagsComponent.ID);
        if(hasCamTargetComponent) character.addComponent(new CameraTargetComponent(), CameraTargetComponent.ID);



        return character;
    }




}
