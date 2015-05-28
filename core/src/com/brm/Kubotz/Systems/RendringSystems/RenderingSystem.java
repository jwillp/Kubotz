package com.brm.Kubotz.Systems.RendringSystems;


import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.graphics.*;
import com.badlogic.gdx.graphics.g2d.ParticleEffect;
import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.badlogic.gdx.graphics.glutils.ShapeRenderer;
import com.badlogic.gdx.maps.MapRenderer;
import com.badlogic.gdx.physics.box2d.Box2DDebugRenderer;
import com.badlogic.gdx.physics.box2d.World;
import com.brashmonkey.spriter.Spriter;
import com.brm.GoatEngine.ECS.Components.EntityComponent;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Entity.EntityManager;
import com.brm.GoatEngine.ECS.Systems.EntitySystem;
import com.brm.GoatEngine.GParticleEffect;
import com.brm.GoatEngine.Utils.Logger;
import com.brm.Kubotz.Components.Graphics.SpriterAnimationComponent;
import com.brm.Kubotz.Components.ParticleEffectComponent;
import com.brm.Kubotz.Config;
import com.brm.Kubotz.Visuals.Renderers.CameraDebugRenderer;
import com.brm.Kubotz.Systems.PhysicsSystem;

/**
 * Responsible for displaying all visual elements on screen
 */
public class RenderingSystem extends EntitySystem {

    //SubSystems
    private CameraSystem cameraSystem;
    private HUDSystem hudSystem;

    private SpriteBatch spriteBatch = new SpriteBatch();
    private ShapeRenderer shapeRenderer = new ShapeRenderer();

    private Box2DDebugRenderer debugRenderer;



    public RenderingSystem(EntityManager em) {
        super(em);
        this.cameraSystem = new CameraSystem(em);
        this.hudSystem = new HUDSystem(em, this.shapeRenderer, spriteBatch);
        debugRenderer = new Box2DDebugRenderer();
    }

    @Override
    public void init() {
        this.getSystemManager().addSystem(CameraSystem.class, this.cameraSystem);
        this.getSystemManager().addSystem(HUDSystem.class, this.hudSystem);
    }

    @Override
    public void update(float dt){
        this.cameraSystem.update(dt);

        World world = getSystemManager().getSystem(PhysicsSystem.class).getWorld();
        if(Config.DEBUG_RENDERING_ENABLED) {
            this.renderDebug(world); //TODO get FROM System Manager
        }

        if(Config.TEXTURE_RENDERING_ENABLED){
            renderTextures();
        }



    }

    public void renderHud(float dt){
        this.hudSystem.update(dt);
    }

    public void renderMap(MapRenderer mapRenderer){
        mapRenderer.setView(getCamera());
        mapRenderer.render();
    }




    /**
     * Renders the texture of all the entities
     */
    private void renderTextures(){


        spriteBatch.setProjectionMatrix(this.getCamera().combined);
        spriteBatch.begin();

        //UPDATE SPRITER
        for(Entity entity: em.getEntitiesWithComponent(SpriterAnimationComponent.ID)){
            SpriterAnimationComponent anim = (SpriterAnimationComponent)entity.getComponent(SpriterAnimationComponent.ID);
            PhysicsComponent phys = (PhysicsComponent)  entity.getComponent(PhysicsComponent.ID);


            //float scale = phys.getHeight()/anim.getPlayer().get
            float posX = phys.getPosition().x -phys.getWidth()/2 +0.25f;
            float posY =  phys.getPosition().y -phys.getHeight()/2 - 0.5f; //TODO have real scaling


            anim.getPlayer().setPosition(posX, posY);
            anim.getPlayer().setAngle(phys.getBody().getAngle());
            anim.getPlayer().setScale(0.005f);

        }
        Spriter.draw();


        spriteBatch.end();



        //Particle Effectsv
        spriteBatch.begin();
        spriteBatch.setProjectionMatrix(this.getCamera().combined);
        for(EntityComponent comp: em.getComponents(ParticleEffectComponent.ID)){

            ParticleEffectComponent pef = (ParticleEffectComponent) comp;
            for(ParticleEffect effect: pef.getEffects()){


                effect.update(Gdx.graphics.getDeltaTime()); //TODO get from method delta
                effect.draw(spriteBatch);


                if(effect.isComplete()){
                    effect.reset(); // TODO is LOOPING
                }
            }
        }
        spriteBatch.end();



    }




    /**
     * Renders all the debug graphics
     * @param world
     */
    private void renderDebug(World world){

        this.spriteBatch.begin();
        debugRenderer.render(world, cameraSystem.getMainCamera().combined);
        this.spriteBatch.end();

        /** CAMERA DEBUG */
        CameraDebugRenderer cdr = new CameraDebugRenderer(cameraSystem.getMainCamera(), shapeRenderer);
        cdr.render();

        /** FPS **/

        //BitmapFont font = new BitmapFont();
        //spriteBatch.begin();
        //font.draw(spriteBatch, "FPS: " + Gdx.graphics.getFramesPerSecond(), 0, Gdx.graphics.getHeight());
        /*
        font.draw(sb, "IS GROUNDED: " + ((PhysicsComponent) this.player.getComponent(PhysicsComponent.ID)).isGrounded(), 0, Gdx.graphics.getHeight() - 30);


        String velText = "Velocity: " + ((PhysicsComponent) this.player.getComponent(PhysicsComponent.ID)).getVelocity();
        font.draw(sb, velText, 0, Gdx.graphics.getHeight() - 50);

        font.draw(sb, "NB JUMPS: " + ((JumpComponent) this.player.getComponent(JumpComponent.ID)).getNbJujmps(), 0, Gdx.graphics.getHeight() - 80);
        font.draw(sb, "NB JUMPS MAX: " + ((JumpComponent) this.player.getComponent(JumpComponent.ID)).getNbJumpsMax(), 0, Gdx.graphics.getHeight() - 100);
        font.draw(sb, "CONTACTS: " + ((PhysicsComponent) this.player.getComponent(PhysicsComponent.ID)).getContacts().size(), 0, Gdx.graphics.getHeight() - 120);
        */
        //spriteBatch.end();


    }



    public OrthographicCamera getCamera(){
        return this.cameraSystem.getMainCamera();
    }

    public SpriteBatch getSpriteBatch() {
        return spriteBatch;
    }

    public void setSpriteBatch(SpriteBatch spriteBatch) {
        this.spriteBatch = spriteBatch;
    }

    public ShapeRenderer getShapeRenderer() {
        return shapeRenderer;
    }

    public void setShapeRenderer(ShapeRenderer shapeRenderer) {
        this.shapeRenderer = shapeRenderer;
    }
}
