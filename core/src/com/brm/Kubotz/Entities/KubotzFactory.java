package com.brm.Kubotz.Entities;

import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.math.Vector2;
import com.badlogic.gdx.physics.box2d.*;
import com.brm.GoatEngine.ECS.Components.Cameras.CameraTargetComponent;
import com.brm.GoatEngine.ECS.Components.HealthComponent;
import com.brm.GoatEngine.ECS.Components.JumpComponent;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Components.TagsComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Entity.EntityFactory;
import com.brm.GoatEngine.ECS.Entity.EntityManager;
import com.brm.GoatEngine.Input.VirtualGamePad;
import com.brm.Kubotz.Component.AppearanceComponent;
import com.brm.Kubotz.Component.GrabComponent;
import com.brm.Kubotz.Component.Powerups.PowerUpsContainerComponent;
import com.brm.Kubotz.Component.PunchComponent;
import com.brm.Kubotz.Component.Skills.DashComponent;
import com.brm.Kubotz.Constants;


/**
 * Used to create block entities
 */
public class KubotzFactory extends EntityFactory {

    private World world;
    private Vector2 position = new Vector2(0,0);
    private Vector2 size = new Vector2(0.5f, 0.5f);
    private VirtualGamePad.InputSource inputSource = VirtualGamePad.InputSource.USER_INPUT;
    private TagsComponent tagsComponent = new TagsComponent();

    private boolean hasCamTargetComponent = false;

    public KubotzFactory(EntityManager entityManager, World world, Vector2 position) {
        super(entityManager);
        this.world = world;
        this.position = position;
    }






    /**
     * Adds a camera targetComponent to the Robot
     * @return this for chaining
     */
    public KubotzFactory withCameraTargetComponent(){
        hasCamTargetComponent = true;
        return this;
    }


    /**
     * Defines the height of the Robot and the width ACCORDINGLY
     * @return this for chaining
     */
    public KubotzFactory withHeight(float height){
        height /= 2; //Since box2D uses half width;
        this.size = new Vector2(height/2, height);
        return this;
    }

    /**
     * Defines the width of the Robot and the height ACCORDINGLY
     * @return this for chaining
     */
    public KubotzFactory withWidth(float width){
        width /= 2;
        this.size = new Vector2(width, width*2);
        return this;
    }

    /**
     * Defines the inputSource to which the Kubotz should react;
     * @param inputSource
     * @return
     */
    public KubotzFactory withInputSource(VirtualGamePad.InputSource inputSource){
        this.inputSource = inputSource;
        return this;
    }


    public KubotzFactory withTag(String tag){
        this.tagsComponent.addTag(tag);
        return this;
    }




    @Override
    public Entity build() {
        Entity character = new Entity();
        entityManager.registerEntity(character);

        PhysicsComponent physics = this.buildBody(character);
        character.addComponent(physics, PhysicsComponent.ID);

        //Appearance
        AppearanceComponent appearance = new AppearanceComponent();
        appearance.setDebugColor(Color.GREEN);
        character.addComponent(appearance, AppearanceComponent.ID);



        //TAGS
        tagsComponent.addTag(Constants.ENTITY_TAG_KUBOTZ);
        character.addComponent(this.tagsComponent, TagsComponent.ID);

        // JUMP
        character.addComponent(new VirtualGamePad(this.inputSource), VirtualGamePad.ID);
        character.addComponent(new JumpComponent(3), JumpComponent.ID);



        //CAM
        if(hasCamTargetComponent) character.addComponent(new CameraTargetComponent(), CameraTargetComponent.ID);


        /* Flying Component */
        //character.addComponent(new FlyComponent(1000, Timer.INFINITE), FlyComponent.ID);

        /* DASH Component */
        character.addComponent(new DashComponent(), DashComponent.ID);

        /* MAGNETIC FEET */
        //character.addComponent(new MagneticFeetComponent(), MagneticFeetComponent.ID);

        /* PUNCH Component*/
        character.addComponent(new PunchComponent(physics), PunchComponent.ID);

        //HEALTH
        character.addComponent(new HealthComponent(100), HealthComponent.ID);

        //GRAB
        character.addComponent(new GrabComponent(), GrabComponent.ID);

        //PowerUps
        character.addComponent(new PowerUpsContainerComponent(), PowerUpsContainerComponent.ID);

        return character;
    }


    /**
     * Creates a Kubotz body + a Physics Component
     * @param character
     */
    private PhysicsComponent buildBody(Entity character){

        //Physics
        PhysicsComponent physics;

        physics = new PhysicsComponent(world, BodyDef.BodyType.DynamicBody, position, size.x, size.y);
        physics.getAcceleration().set(0.5f, 20.0f);

        physics.getBody().setFixedRotation(true);
        physics.getBody().setSleepingAllowed(false);

        FixtureDef fixtureDef;

        ///MIDDLE
        PolygonShape polyShape = new PolygonShape();
        polyShape.setAsBox(physics.getWidth() * 0.90f, 0.5f * physics.getHeight());
        fixtureDef = new FixtureDef();
        fixtureDef.shape = polyShape;
        fixtureDef.density = 0;
        physics.getBody().createFixture(fixtureDef).setUserData(Constants.FIXTURE_TORSO);
        polyShape.dispose();

        // Circle 1
        CircleShape circleShapeTop = new CircleShape();
        circleShapeTop.setRadius(physics.getWidth());
        circleShapeTop.setPosition(new Vector2(0, size.y * 0.5f));
        fixtureDef = new FixtureDef();
        fixtureDef.shape = circleShapeTop;
        fixtureDef.density = 0.1f;
        physics.getBody().createFixture(fixtureDef).setUserData(Constants.FIXTURE_HEAD);
        circleShapeTop.dispose();


        // Circle 2
        CircleShape circleShapeBottom = new CircleShape();
        circleShapeBottom.setRadius(physics.getWidth());
        circleShapeBottom.setPosition(new Vector2(0, -size.y * 0.5f));
        fixtureDef = new FixtureDef();
        fixtureDef.shape = circleShapeBottom;
        fixtureDef.density = 0.1f;
        physics.getBody().createFixture(fixtureDef).setUserData(Constants.FIXTURE_LEGS);
        circleShapeBottom.dispose();


        //foot fixture
        PolygonShape footSensor = new PolygonShape();
        footSensor.setAsBox(0.1f,0.1f, new Vector2(0, -size.y), 0);
        fixtureDef.isSensor = true;
        fixtureDef.shape = footSensor;
        physics.getBody().createFixture(fixtureDef).setUserData(Constants.FIXTURE_FEET_SENSOR);



        // Add user data to Body
        physics.getBody().setUserData(character);

        return physics;
    }














}
