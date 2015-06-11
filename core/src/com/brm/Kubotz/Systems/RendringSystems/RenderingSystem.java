package com.brm.Kubotz.Systems.RendringSystems;


import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.graphics.*;
import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.badlogic.gdx.graphics.glutils.ShapeRenderer;
import com.badlogic.gdx.maps.MapRenderer;
import com.badlogic.gdx.math.Vector2;
import com.badlogic.gdx.physics.box2d.Box2DDebugRenderer;
import com.badlogic.gdx.physics.box2d.World;
import com.brashmonkey.spriter.Spriter;
import com.brm.GoatEngine.ECS.core.Components.EntityComponent;
import com.brm.GoatEngine.ECS.utils.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.core.Entity.Entity;
import com.brm.GoatEngine.ECS.core.Systems.EntitySystem;
import com.brm.GoatEngine.Utils.GParticleEffect;
import com.brm.GoatEngine.AI.Components.AIComponent;
import com.brm.GoatEngine.AI.Pathfinding.PathNode;
import com.brm.GoatEngine.Utils.Logger;
import com.brm.Kubotz.Components.Graphics.SpriterAnimationComponent;
import com.brm.Kubotz.Components.Graphics.ParticleEffectComponent;
import com.brm.Kubotz.Config;
import com.brm.Kubotz.Features.GameRules.Components.PlayerScoreComponent;
import com.brm.Kubotz.Features.Respawn.Components.RespawnComponent;
import com.brm.Kubotz.Systems.AISystem;
import com.brm.Kubotz.Visuals.Renderers.CameraDebugRenderer;
import com.brm.Kubotz.Systems.PhysicsSystem;

import java.util.Iterator;

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


    private final OrthographicCamera backgroundCamera;
    private final Texture background;


    private Texture player1Label = new Texture(Gdx.files.internal("hud/player1_label.png"));
    private Texture player2Label = new Texture(Gdx.files.internal("hud/player2_label.png"));
    private Texture cpuLabel = new Texture(Gdx.files.internal("hud/cpu_label.png"));


    public RenderingSystem() {
        this.cameraSystem = new CameraSystem();
        this.hudSystem = new HUDSystem(this.shapeRenderer, spriteBatch);
        debugRenderer = new Box2DDebugRenderer();
        backgroundCamera = new OrthographicCamera(Config.V_WIDTH, Config.V_HEIGHT);
        backgroundCamera.translate(Config.V_WIDTH/2,Config.V_HEIGHT/2,0);
        backgroundCamera.update();

        background = new Texture(Gdx.files.internal("maps/background.jpg"));

    }

    @Override
    public void init() {
        this.getSystemManager().addSystem(CameraSystem.class, this.cameraSystem);
        this.getSystemManager().addSystem(HUDSystem.class, this.hudSystem);
    }

    @Override
    public void update(float dt){
        this.cameraSystem.update(dt);

        Gdx.gl.glClearColor(26f/255f,26f/255f,26f/255f,0);
        Gdx.gl.glClear(GL20.GL_COLOR_BUFFER_BIT | GL20.GL_DEPTH_BUFFER_BIT);


        if(Config.DEBUG_RENDERING_ENABLED) {
            this.renderDebug(getSystemManager().getSystem(PhysicsSystem.class).getWorld());
            //this.renderPathfinding();
        }

        if(Config.TEXTURE_RENDERING_ENABLED){
            renderTextures(dt);
            renderPlayerLabels();
        }



    }




    public void renderHud(float dt){
        this.hudSystem.update(dt);
    }

    public void renderMap(MapRenderer mapRenderer){
        if(!Config.DEBUG_RENDERING_ENABLED){
            mapRenderer.setView(getCamera());
            mapRenderer.render();
        }

    }





    /**
     * Renders the texture of all the entities
     */
    private void renderTextures(float deltaTime){

        spriteBatch.setProjectionMatrix(this.getCamera().combined);

        //BACKGROUND
        spriteBatch.begin();
        //spriteBatch.draw(this.background,0,0, 52, 37);

        //UPDATE SPRITER
        for(Entity entity: getEntityManager().getEntitiesWithComponent(SpriterAnimationComponent.ID)){
            SpriterAnimationComponent anim = (SpriterAnimationComponent)entity.getComponent(SpriterAnimationComponent.ID);
            PhysicsComponent phys = (PhysicsComponent)  entity.getComponent(PhysicsComponent.ID);

            if(!anim.isEnabled()){
                //anim.getPlayer().setScale(0); // Fake not draw
                //TODO Fix this
                Logger.log(anim.getPlayer().getScale());

            }else{
                if(anim.getPlayer().getScale() == 0) {
                    anim.getPlayer().setScale(1); //In case the scale was 0
                }

                //float scale = phys.getHeight()/anim.getPlayer().get
                float posX = phys.getPosition().x + anim.getOffsetX();
                float posY =  phys.getPosition().y + anim.getOffsetY();

                anim.getPlayer().setPosition(posX, posY);
                anim.getPlayer().setAngle(phys.getBody().getAngle());
                anim.getPlayer().setScale(anim.getScale());
            }





        }
        Spriter.draw();



        spriteBatch.end();



        //Particle Effects
        if(Config.PARTICLES_ENABLED){
            spriteBatch.begin();
            spriteBatch.setProjectionMatrix(this.getCamera().combined);
            for(EntityComponent comp: getEntityManager().getComponents(ParticleEffectComponent.ID)){

                ParticleEffectComponent pef = (ParticleEffectComponent) comp;
                for (Iterator<GParticleEffect> iterator = pef.getEffects().iterator(); iterator.hasNext(); ) {
                    GParticleEffect effect = iterator.next();

                    effect.update(deltaTime);

                    spriteBatch.getColor().a = pef.getAlpha();
                    effect.draw(spriteBatch);
                    spriteBatch.getColor().a = 1.0f; //Default alpha

                    if (effect.isComplete()){
                        if (effect.isLooping()){
                            iterator.remove();
                        }
                    }
                }
            }
            spriteBatch.end();
        }




    }







    /**
     * Renders images on top of players labeling their player ID
     * wheter P1 , P2 or CPU
     */
    private void renderPlayerLabels() {

        spriteBatch.begin();

        for(Entity entity: getEntityManager().getEntitiesWithComponentEnabled(PlayerScoreComponent.ID)){
            PlayerScoreComponent info = (PlayerScoreComponent) entity.getComponent(PlayerScoreComponent.ID);
            PhysicsComponent phys = (PhysicsComponent) entity.getComponent(PhysicsComponent.ID);
            SpriterAnimationComponent graphics = (SpriterAnimationComponent) entity.getComponent(SpriterAnimationComponent.ID);

            if(graphics.isEnabled()){
                Texture label = null;

                if (info.getPlayerId() == -1) {
                    label = this.cpuLabel;

                } else if (info.getPlayerId() == 1) {
                    label = player1Label;

                } else if (info.getPlayerId() == 2) {
                    label = player2Label;

                }

                float size = 1.5f;
                size *= this.cameraSystem.getMainCamera().zoom*1.8f;
                if(size<1){size = 1;}
                Vector2 labelPos =  new Vector2(
                        phys.getPosition().x - size/2,
                        phys.getPosition().y + phys.getHeight() + 1
                );


                spriteBatch.draw(label, labelPos.x, labelPos.y, size, size);
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

       // BitmapFont font = new BitmapFont();
        //spriteBatch.begin();
        /*font.draw(spriteBatch, "FPS: " + Gdx.graphics.getFramesPerSecond(), 0, Gdx.graphics.getHeight());

        font.draw(spriteBatch, "IS GROUNDED: " + ((PhysicsComponent) this.player.getComponent(PhysicsComponent.ID)).isGrounded(), 0, Gdx.graphics.getHeight() - 30);


        String velText = "Velocity: " + ((PhysicsComponent) this.player.getComponent(PhysicsComponent.ID)).getVelocity();
        font.draw(spriteBatch, velText, 0, Gdx.graphics.getHeight() - 50);

        font.draw(spriteBatch, "NB JUMPS: " + ((JumpComponent) this.player.getComponent(JumpComponent.ID)).getNbJujmps(), 0, Gdx.graphics.getHeight() - 80);
        font.draw(spriteBatch, "NB JUMPS MAX: " + ((JumpComponent) this.player.getComponent(JumpComponent.ID)).getNbJumpsMax(), 0, Gdx.graphics.getHeight() - 100);
        font.draw(spriteBatch, "CONTACTS: " + ((PhysicsComponent) this.player.getComponent(PhysicsComponent.ID)).getContacts().size(), 0, Gdx.graphics.getHeight() - 120);*/

        //spriteBatch.end();


    }


    /**
     * Debug method to render the path and nodes of AI
     */
    private void renderPathfinding() {
        float NODE_SIZE = 0.4f;

        for(PathNode node: AISystem.pathfinder.nodes) {
            shapeRenderer.setProjectionMatrix(this.getCamera().combined);
            shapeRenderer.begin(ShapeRenderer.ShapeType.Line);
            if (node.isWalkable)
                shapeRenderer.setColor(Color.RED);
            shapeRenderer.rect(node.position.x, node.position.y, NODE_SIZE, NODE_SIZE);
            shapeRenderer.end();
        }

        //Pathfinding display
        for (Entity e : this.getEntityManager().getEntitiesWithComponent(AIComponent.ID)){

            AIComponent aiComp = (AIComponent) e.getComponent(AIComponent.ID);

            //NODES
            for(PathNode node: aiComp.getCurrentPath()) {
                shapeRenderer.setProjectionMatrix(this.getCamera().combined);
                shapeRenderer.begin(ShapeRenderer.ShapeType.Line);
                if (node.isWalkable)
                    shapeRenderer.setColor(Color.RED);
                if(aiComp.getCurrentPath().indexOf(node) == 0)
                    shapeRenderer.setColor(Color.GREEN);
                if(aiComp.getCurrentPath().indexOf(node) == aiComp.getCurrentPath().size()-1)
                    shapeRenderer.setColor(Color.MAGENTA);
                shapeRenderer.rect(node.position.x, node.position.y, NODE_SIZE, NODE_SIZE);
                shapeRenderer.end();
            }

            // PATH
            for(PathNode node: aiComp.getCurrentPath()){
                if(node.parent != null){
                    shapeRenderer.begin(ShapeRenderer.ShapeType.Line); // shape type
                    shapeRenderer.setColor(1, 0, 0, 1); // line's color

                    float offset = NODE_SIZE/2;
                    shapeRenderer.line(
                            node.position.x + offset , node.position.y + offset,
                            node.parent.position.x + offset, node.parent.position.y + offset
                    );
                    shapeRenderer.end();
                }
            }


        }


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
