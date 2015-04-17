package com.brm.Kubotz.Systems.RenderingSystem;


import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.graphics.OrthographicCamera;
import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.badlogic.gdx.graphics.g2d.TextureAtlas;
import com.badlogic.gdx.graphics.g2d.TextureRegion;
import com.badlogic.gdx.graphics.glutils.ShapeRenderer;
import com.badlogic.gdx.math.MathUtils;
import com.badlogic.gdx.physics.box2d.Box2DDebugRenderer;
import com.badlogic.gdx.physics.box2d.World;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Entity.EntityManager;
import com.brm.GoatEngine.ECS.System.CameraSystem;
import com.brm.GoatEngine.ECS.System.EntitySystem;
import com.brm.GoatEngine.Utils.Logger;
import com.brm.Kubotz.Component.SpriteComponent;
import com.brm.Kubotz.Config;
import com.brm.Kubotz.Renderers.CameraDebugRenderer;

/**
 * Responsible for displaying all visual elements on screen
 */
public class RenderingSystem extends EntitySystem {

    private CameraSystem cameraSystem;
    private SpriteBatch spriteBatch = new SpriteBatch();
    private ShapeRenderer shapeRenderer = new ShapeRenderer();
    private Box2DDebugRenderer debugRenderer;


    private TextureAtlas textureAtlas;
    private AnimationSystem animationSystem;


    public RenderingSystem(EntityManager em) {
        super(em);
        this.cameraSystem = new CameraSystem(em);
        this.animationSystem = new AnimationSystem(em);

        debugRenderer = new Box2DDebugRenderer();

        this.textureAtlas = new TextureAtlas(Gdx.files.internal("textures/textures.atlas"), Gdx.files.internal("textures"));
    }



    public void update(){
        this.cameraSystem.update();
        this.animationSystem.update();
    }






    public void render(World world){
        if(Config.DEBUG_RENDERING_ENABLED) {
            this.renderDebug(world);
        }

        if(Config.TEXTURE_RENDERING_ENABLED){
            renderTextures();
        }


    }

    /**
     * Renders the texture of all the entities
     */
    private void renderTextures(){

        spriteBatch.setProjectionMatrix(this.getCamera().combined);
        spriteBatch.begin();
        for(Entity entity: em.getEntitiesWithComponent(SpriteComponent.ID)){

            SpriteComponent spriteComp = (SpriteComponent) entity.getComponent(SpriteComponent.ID);
            PhysicsComponent phys = (PhysicsComponent)  entity.getComponent(PhysicsComponent.ID);



            TextureRegion frame = spriteComp.animation.getKeyFrame(spriteComp.stateTime, true);


            float height = phys.getHeight()*2;
            float width = height * (frame.getRegionHeight()/frame.getRegionWidth());

            spriteBatch.draw(frame, phys.getPosition().x-phys.getWidth()*2, phys.getPosition().y-phys.getHeight(),
                    width, height
            );





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
