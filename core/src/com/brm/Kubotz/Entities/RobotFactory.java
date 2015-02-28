package com.brm.Kubotz.Entities;

import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.math.Vector2;
import com.badlogic.gdx.physics.box2d.*;
import com.brm.GoatEngine.ECS.Components.Cameras.CameraTargetComponent;
import com.brm.GoatEngine.ECS.Components.JumpComponent;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Components.TagsComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Entity.EntityFactory;
import com.brm.GoatEngine.ECS.EntityManager;
import com.brm.GoatEngine.Input.VirtualGamePad;
import com.brm.Kubotz.Component.AppearanceComponent;

import com.brm.Kubotz.Component.Skills.DashComponent;


/**
 * Used to create block entities
 */
public class RobotFactory extends EntityFactory {

    private World world;
    private Vector2 position = new Vector2(0,0);
    private Vector2 size = new Vector2(0.5f, 0.5f);

    private boolean hasCamTargetComponent = false;

    public RobotFactory(EntityManager entityManager, World world, Vector2 position) {
        super(entityManager);
        this.world = world;
        this.position = position;
    }


    /**
     * Adds a camera targetComponent to the Robot
     * @return this for chaining
     */
    public RobotFactory withCameraTargetComponent(){
        hasCamTargetComponent = true;
        return this;
    }


    /**
     * Defines the height of the Robot and the width ACCORDINGLY
     * @return this for chaining
     */
    public RobotFactory withHeight(float height){
        height /= 2; //Since box2D uses half width;
        this.size = new Vector2(height/2, height);
        return this;
    }

    /**
     * Defines the width of the Robot and the height ACCORDINGLY
     * @return this for chaining
     */
    public RobotFactory withWidth(float width){
        width /= 2;
        this.size = new Vector2(width, width*2);
        return this;
    }





    @Override
    public Entity build() {
        Entity character = new Entity();
        entityManager.registerEntity(character);

        //Physics
        PhysicsComponent physics;

        physics = new PhysicsComponent(world, BodyDef.BodyType.DynamicBody, position, size.x, size.y);
        physics.getAcceleration().set(0.5f, 20.0f);

        physics.getBody().setFixedRotation(true);
        physics.getBody().setSleepingAllowed(false);

        FixtureDef fixtureDef;

        ///MIDDLE
        PolygonShape polyShape = new PolygonShape();
        polyShape.setAsBox(physics.getWidth()*0.90f, 0.5f * physics.getHeight());
        fixtureDef = new FixtureDef();
        fixtureDef.shape = polyShape;
        fixtureDef.density = 0;
        physics.getBody().createFixture(fixtureDef);
        polyShape.dispose();

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




        character.addComponent(physics, PhysicsComponent.ID);
        character.addComponent(appearance, AppearanceComponent.ID);
        character.addComponent(new JumpComponent(3), JumpComponent.ID);
        character.addComponent(new VirtualGamePad(VirtualGamePad.InputSource.USER_INPUT), VirtualGamePad.ID);

        character.addComponent(new TagsComponent(), TagsComponent.ID);

        if(hasCamTargetComponent) character.addComponent(new CameraTargetComponent(), CameraTargetComponent.ID);


        /* Flying Component */
        //character.addComponent(new FlyComponent(1000, Timer.INFINITE), FlyComponent.ID);

        /* DASH Component */
        character.addComponent(new DashComponent(), DashComponent.ID);

        /* MAGNETIC FEET */
        //character.addComponent(new MagneticFeetComponent(), MagneticFeetComponent.ID);


        return character;
    }




}