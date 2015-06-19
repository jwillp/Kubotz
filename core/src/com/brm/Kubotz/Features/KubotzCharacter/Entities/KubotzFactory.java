package com.brm.Kubotz.Features.KubotzCharacter.Entities;

import com.badlogic.gdx.math.Vector2;
import com.badlogic.gdx.physics.box2d.*;
import com.brashmonkey.spriter.Spriter;
import com.brm.GoatEngine.ECS.common.*;
import com.brm.GoatEngine.ECS.core.Entity;
import com.brm.GoatEngine.ECS.core.EntityFactory;
import com.brm.GoatEngine.ECS.core.EntityManager;
import com.brm.GoatEngine.GoatEngine;
import com.brm.GoatEngine.Input.VirtualGamePad;
import com.brm.Kubotz.Common.Components.Graphics.ParticleEffectComponent;
import com.brm.Kubotz.Common.Components.Graphics.SpriterAnimationComponent;
import com.brm.Kubotz.Common.Hitbox.Hitbox;
import com.brm.Kubotz.Constants;
import com.brm.Kubotz.Features.Grab.Components.GrabComponent;
import com.brm.Kubotz.Features.KubotzCharacter.Components.UIHealthComponent;
import com.brm.Kubotz.Features.KubotzCharacter.Scripts.KubotzAnimationScript;
import com.brm.Kubotz.Features.KubotzCharacter.Scripts.KubotzAudioScript;
import com.brm.Kubotz.Features.MeleeAttacks.Components.MeleeComponent;
import com.brm.Kubotz.Features.PowerUps.Components.PowerUpsContainerComponent;
import com.brm.Kubotz.Features.Respawn.Components.RespawnComponent;
import com.brm.Kubotz.Features.Running.Components.RunningComponent;


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

        // PHYSICS
        PhysicsComponent physics = this.buildBody(character);
        character.addComponent(physics, PhysicsComponent.ID);

        //TAGS
        tagsComponent.addTag(Constants.ENTITY_TAG_KUBOTZ);
        character.addComponent(this.tagsComponent, TagsComponent.ID);

        // INPUT
        character.addComponent(new VirtualGamePad(this.inputSource), VirtualGamePad.ID);

        // JUMP
        character.addComponent(new RunningComponent(), RunningComponent.ID);
        character.addComponent(new JumpComponent(3), JumpComponent.ID);

        //CAM
        if(hasCamTargetComponent) character.addComponent(new CameraTargetComponent(), CameraTargetComponent.ID);

        //HEALTH
        character.addComponent(new HealthComponent(100), HealthComponent.ID);
        character.addComponent(new ManaComponent(100), ManaComponent.ID);
        /* Flying Component */
        //character.addComponent(new FlyingBootsComponent(), FlyingBootsComponent.ID);

        /* DASH Component */
        //character.addComponent(new DashBootsComponent(), DashBootsComponent.ID);

        /* MAGNETIC FEET */
        //character.addComponent(new MagneticBootsComponent(), MagneticBootsComponent.ID);

        // DRONE GAUNTLET
        //character.addComponent(new DroneGauntletComponent(), DroneGauntletComponent.ID);

        /* PUNCH Component*/
        character.addComponent(new MeleeComponent(physics), MeleeComponent.ID);

        //Respawn
        character.addComponent(new RespawnComponent(), RespawnComponent.ID);


        //GRAB
        character.addComponent(new GrabComponent(), GrabComponent.ID);

        //PowerUps
        character.addComponent(new PowerUpsContainerComponent(), PowerUpsContainerComponent.ID);


        //Scripts
        ScriptComponent scriptComponent = new ScriptComponent();
        //scriptComponent.addScript(new KubotzAnimationScript());
        //scriptComponent.addScript(new KubotzAudioScript());
        scriptComponent.addScript("scripts/Script.js");
        character.addComponent(scriptComponent, ScriptComponent.ID);

        //character.addComponent(new GunComponent(GunComponent.Type.LASER_MK_I), GunComponent.ID);


        // GRAPHICS
        //ANIMATION
        character.addComponent(
                new SpriterAnimationComponent(
                        Spriter.newPlayer(Constants.KUBOTZ_ANIM_FILE, "Kubotz"),
                        -physics.getWidth()/2 +0.25f,
                        -physics.getHeight()/2-0.5f,
                        0.005f
                ),
                SpriterAnimationComponent.ID
        );
        // UI Health Bar
        character.addComponent(new UIHealthComponent(), UIHealthComponent.ID);
        //Particle effect
        character.addComponent(new ParticleEffectComponent(), ParticleEffectComponent.ID);




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
        physics.getBody().createFixture(fixtureDef).setUserData(new Hitbox(Hitbox.Type.Damageable, Constants.HITBOX_LABEL_TORSO));
        polyShape.dispose();

        // Circle TOP
        CircleShape circleShapeTop = new CircleShape();
        circleShapeTop.setRadius(physics.getWidth());
        circleShapeTop.setPosition(new Vector2(0, size.y * 0.5f));
        fixtureDef = new FixtureDef();
        fixtureDef.shape = circleShapeTop;
        fixtureDef.density = 0.1f;
        physics.getBody().createFixture(fixtureDef).setUserData(new Hitbox(Hitbox.Type.Damageable, Constants.HITBOX_LABEL_HEAD));
        circleShapeTop.dispose();


        // Circle BOTTOM
        CircleShape circleShapeBottom = new CircleShape();
        circleShapeBottom.setRadius(physics.getWidth());
        circleShapeBottom.setPosition(new Vector2(0, -size.y * 0.5f));
        fixtureDef = new FixtureDef();
        fixtureDef.shape = circleShapeBottom;
        fixtureDef.density = 0.1f;
        physics.getBody().createFixture(fixtureDef).setUserData(new Hitbox(Hitbox.Type.Damageable, Constants.HITBOX_LABEL_LEGS));
        circleShapeBottom.dispose();


        //FEET FIXTURE
        PolygonShape footSensor = new PolygonShape();
        footSensor.setAsBox(0.1f,0.1f, new Vector2(0, -size.y), 0);
        fixtureDef.isSensor = true;
        fixtureDef.shape = footSensor;
        physics.getBody().createFixture(fixtureDef).setUserData(new Hitbox(Hitbox.Type.Damageable,Constants.HITBOX_LABEL_FEET));



        // Add user data to Body
        physics.getBody().setUserData(character);

        return physics;
    }














}
