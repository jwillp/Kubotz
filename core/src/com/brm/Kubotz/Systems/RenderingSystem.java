package com.brm.Kubotz.Systems;


import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.graphics.OrthographicCamera;
import com.badlogic.gdx.graphics.g2d.BitmapFont;
import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.badlogic.gdx.graphics.glutils.ShapeRenderer;
import com.badlogic.gdx.math.Matrix4;
import com.badlogic.gdx.physics.box2d.Box2DDebugRenderer;
import com.badlogic.gdx.physics.box2d.World;
import com.brm.GoatEngine.AI.Pathfinding.Node;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Entity.EntityManager;
import com.brm.GoatEngine.ECS.System.CameraSystem;
import com.brm.GoatEngine.ECS.System.EntitySystem;
import com.brm.Kubotz.Component.AI.KubotzAIComponent;
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

    public RenderingSystem(EntityManager em) {
        super(em);
        this.cameraSystem = new CameraSystem(em);
        debugRenderer = new Box2DDebugRenderer();
    }


    public void update(){
        this.cameraSystem.update();
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


        /** PATHFINDING DEBUG **/
        //Pathfinding display
        for(Entity e: this.em.getEntitiesWithComponent(KubotzAIComponent.ID)){

            KubotzAIComponent aiComp = (KubotzAIComponent) e.getComponent(KubotzAIComponent.ID);

            int index = 0;
            for(Node node: aiComp.pathfinder.path) {
                this.shapeRenderer.setProjectionMatrix(this.getCamera().combined);
                this.shapeRenderer.begin(ShapeRenderer.ShapeType.Line);

                if (node.isWalkable)
                    shapeRenderer.setColor(Color.RED); // RED
                else
                    shapeRenderer.setColor(Color.BLACK);

                if(index == 0)
                    shapeRenderer.setColor(Color.GREEN);

                shapeRenderer.rect(node.position.x, node.position.y, aiComp.pathfinder.NODE_SIZE, aiComp.pathfinder.NODE_SIZE);
                shapeRenderer.end();
                index++;
            }

            // PATH
            for(Node node: aiComp.pathfinder.path){
                if(node.parent != null){
                    shapeRenderer.begin(ShapeRenderer.ShapeType.Line); // shape type
                    shapeRenderer.setColor(1, 0, 0, 1); // line's color

                    float offset = aiComp.pathfinder.NODE_SIZE/2;
                    shapeRenderer.line(
                            node.position.x + offset , node.position.y + offset,
                            node.parent.position.x + offset, node.parent.position.y + offset
                    );
                    shapeRenderer.end();
                }
            }
        }





        /** FPS **/

        // FPS
        if(Config.DEBUG_RENDERING_ENABLED) {
            SpriteBatch sb = getSpriteBatch();
            BitmapFont font = new BitmapFont();
            sb.begin();
            font.draw(sb, "FPS: " + Gdx.graphics.getFramesPerSecond(), 0, Gdx.graphics.getHeight());
            /*font.draw(sb, "IS GROUNDED: " + ((PhysicsComponent) this.player.getComponent(PhysicsComponent.ID)).isGrounded(), 0, Gdx.graphics.getHeight() - 30);

            String velText = "Velocity: " + ((PhysicsComponent) this.player.getComponent(PhysicsComponent.ID)).getVelocity();
            font.draw(sb, velText, 0, Gdx.graphics.getHeight() - 50);*/
            sb.end();
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
