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
import com.brm.GoatEngine.ECS.Components.Cameras.CameraTargetComponent;
import com.brm.Kubotz.Component.Skills.DashComponent;
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


    @Override
    public Entity build() {
        Entity character = new Entity();
        entityManager.registerEntity(character);

        //Physics
        PhysicsComponent physics;
        physics = new PhysicsComponent(world, BodyDef.BodyType.DynamicBody, position.x,position.y, 0.5f,0.5f);
        physics.getAcceleration().set(0.5f, 15.0f);

        CircleShape circleShape = new CircleShape();
        circleShape.setRadius(physics.getWidth());

        FixtureDef fixtureDef = new FixtureDef();
        fixtureDef.shape = circleShape;
        fixtureDef.density = 0.1f;


        physics.getBody().setFixedRotation(true);
        physics.getBody().createFixture(fixtureDef);
        circleShape.dispose();

        //foot fixture
        PolygonShape footSensor = new PolygonShape();
        footSensor.setAsBox(0.1f,0.1f, new Vector2(0,-0.5f), 0);
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



        character.addComponent(physics, PhysicsComponent.ID);
        character.addComponent(appearance, AppearanceComponent.ID);
        character.addComponent(jp, JumpComponent.ID);
        character.addComponent(gamePad, VirtualGamePad.ID);
        character.addComponent(new TagsComponent(), TagsComponent.ID);
        if(hasCamTargetComponent) character.addComponent(new CameraTargetComponent(), CameraTargetComponent.ID);


        /* Flying Component */
        FlyComponent fp = new FlyComponent(1000, Timer.INFINITE);
        //character.addComponent(fp, FlyComponent.ID);


        /* DASH Component */
        DashComponent dash = new DashComponent();
        character.addComponent(dash, DashComponent.ID);




        return character;
    }




}
