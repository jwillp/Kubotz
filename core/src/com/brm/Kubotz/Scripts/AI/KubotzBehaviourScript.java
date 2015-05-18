package com.brm.Kubotz.Scripts.AI;

import com.badlogic.gdx.math.Vector2;
import com.brm.GoatEngine.AI.BehaviourTree.Node;
import com.brm.GoatEngine.AI.BehaviourTree.Selector;
import com.brm.GoatEngine.AI.BehaviourTree.Sequence;
import com.brm.GoatEngine.AI.Pathfinding.PathNode;
import com.brm.GoatEngine.ECS.Components.HealthComponent;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Entity.EntityManager;
import com.brm.GoatEngine.ECS.Scripts.EntityScript;
import com.brm.GoatEngine.Input.VirtualGamePad;
import com.brm.GoatEngine.Utils.GameMath.GameMath;
import com.brm.GoatEngine.Utils.GameMath.Vectors;
import com.brm.GoatEngine.Utils.Logger;
import com.brm.Kubotz.Components.AIComponent;
import com.brm.Kubotz.Components.SensorComponent;
import com.brm.Kubotz.Constants;
import com.brm.Kubotz.Input.GameButton;
import com.brm.Kubotz.Systems.AISystem;

import java.util.Hashtable;
import java.util.Random;

/**
 * AI Behaviour for Kubotz
 * TODO Share a single instance of the script
 */
public class KubotzBehaviourScript extends EntityScript{

    // We want a single instance of the Behaviour Tree
    private static Selector behaviourTree = null;

    @Override
    public void onInit(Entity entity, EntityManager manager) {
        AIComponent aiComponent = (AIComponent) entity.getComponent(AIComponent.ID);
        aiComponent.getBlackboard().put("entityManager", manager);
        aiComponent.getBlackboard().put("agent", entity);

        KubotzBehaviourScript.buildTree();

        //TEST //TODO REMOVE
        entity.addComponent(new SensorComponent(3), SensorComponent.ID);



    }

    @Override
    public void onUpdate(Entity entity, EntityManager manager) {
        AIComponent aiComponent = (AIComponent) entity.getComponent(AIComponent.ID);
        if(aiComponent.getReactionTime().isDone()){
           // KubotzBehaviourScript.behaviourTree.tick(aiComponent.getBlackboard());
            aiComponent.getReactionTime().reset();
        }
    }




    ///////////////////////////// BEHAVIOUR TREE ////////////////////////////////

    public static void buildTree(){
        if(KubotzBehaviourScript.behaviourTree != null){
            return;
        }

        Selector root = new Selector();
        //DEFENSIVE
        root.addNode(new DefensiveBehaviour()
                        //Avoid Combat
                        .addNode(new Sequence()
                                        .addNode(new LocateNearestEnemy())
                                        .addNode(new FleeBehaviour()
                                                        .addNode(new CalculateFleeDestination())
                                                        .addNode(new MoveToDestination())
                                                        .addNode(new StopAtDestination())
                                        )
                        )

                //Heal
                        /*.addNode(new Sequence()
                                        .addNode(new LocateNearestHealthBonus())
                                        .addNode(new MoveToDestination())
                                        .addNode(new TakeObject())
                        )*/
        );

        //OFFENSIVE
        root.addNode(new OffensiveBehaviour()
                        .addNode(new Sequence() //Chase
                                        .addNode(new LocateNearestEnemy())
                                        .addNode(new SetEnemyAsTarget())
                                        .addNode(new MoveToDestination())
                                        .addNode(new StopAtDestination())
                                        .addNode(new Sequence()
                                                        .addNode(new AttackWithMeleeWeapon())
                                        )
                        )
        );
        Logger.log("Kubotz BTree Created");
        KubotzBehaviourScript.behaviourTree = root;
    }

    public static class DefensiveBehaviour extends Selector {

        @Override
        public boolean precondition(Hashtable<String, Object> blackBoard) {
            float health = ((HealthComponent)((Entity)blackBoard.get("agent"))
                    .getComponent(HealthComponent.ID)).getAmount();
            return health <= 25;
        }
    }


    /**
     * Finds the nearest enemy in the map
     */
    public static class LocateNearestEnemy extends Node {


        @Override
        public State update(Hashtable<String, Object> blackBoard) {
            EntityManager em = (EntityManager) blackBoard.get("entityManager");

            PhysicsComponent myPhys = (PhysicsComponent)((Entity)blackBoard.get("agent"))
                    .getComponent(PhysicsComponent.ID);

            int smallestDistance = Integer.MAX_VALUE;

            for(Entity entity: em.getEntitiesWithTag(Constants.ENTITY_TAG_KUBOTZ)){

                PhysicsComponent enemyPhys = (PhysicsComponent) entity.getComponent(PhysicsComponent.ID);

                int dist = Vectors.manhattanDistance(enemyPhys.getPosition(), myPhys.getPosition());

                if(dist <= smallestDistance && dist != 0){
                    smallestDistance = dist;
                    blackBoard.put("enemy", entity);
                }
            }

            if(smallestDistance == Integer.MAX_VALUE){
                return State.FAILED;
            }

            return State.SUCCESS;
        }
    }


    /**
     * Calculates a destination far enough from the enemy
     */
    public static class CalculateFleeDestination extends Node{


        @Override
        public State update(Hashtable<String, Object> blackBoard) {
            float MIN_SAFE_DISTANCE = 20;
            if(blackBoard.containsKey("destination")){
                return State.SUCCESS;
            }

            Entity enemy = (Entity)blackBoard.get("enemy");
            PhysicsComponent enemyPhys = (PhysicsComponent) enemy.getComponent(PhysicsComponent.ID);


            //Choose a random point in the map far enough from the enemy
            PathNode node;
            do{
                node = AISystem.pathfinder.nodes.get(new Random().nextInt(AISystem.pathfinder.nodes.size()));
            }while ( Vectors.manhattanDistance(enemyPhys.getPosition(), node.position) <= MIN_SAFE_DISTANCE);


            //Set as destination
            blackBoard.put("destination", node.position);

            return State.SUCCESS;
        }
    }

    /**
     * Flee behaviour
     */
    public static class FleeBehaviour extends Sequence{

        /**
         * If distance between the agent and the enemy is smaller than a MIN DISTANCE
         * @return
         */
        @Override
        public boolean precondition(Hashtable<String, Object> blackBoard) {

            float MIN_DISTANCE = 7;

            Entity enemy = (Entity)blackBoard.get("enemy");
            PhysicsComponent enemyPhys = (PhysicsComponent) enemy.getComponent(PhysicsComponent.ID);

            Entity agent = (Entity)blackBoard.get("agent");
            PhysicsComponent agentPhys = (PhysicsComponent) agent.getComponent(PhysicsComponent.ID);


            return Vectors.manhattanDistance(agentPhys.getPosition(), enemyPhys.getPosition()) < MIN_DISTANCE;
        }
    }


    /**
     * Moves towards a destination
     * By (not fly nor dash)
     */
    public static class MoveToDestination extends Node{

        @Override
        public boolean precondition(Hashtable<String, Object> blackBoard) {
            return blackBoard.get("destination") != null;
        }

        @Override
        public State update(Hashtable<String, Object> blackBoard) {

            //Agent
            Entity agent = (Entity) blackBoard.get("agent");

            AIComponent aiComp = (AIComponent) agent.getComponent(AIComponent.ID);
            PhysicsComponent phys = (PhysicsComponent) agent.getComponent(PhysicsComponent.ID);


            // Determine path with pathfinder
            aiComp.setCurrentPath(AISystem.pathfinder.findPath(
                    phys.getPosition(),
                    (Vector2) blackBoard.get("destination")
            ));


            // Move in the direction of the destination
            if(!aiComp.getCurrentPath().isEmpty()){
                //if(false){
                VirtualGamePad gamePad = (VirtualGamePad) agent.getComponent(VirtualGamePad.ID);
                PathNode node = aiComp.getCurrentPath().get(0);
                Vector2 pos = node.position;

                //LEFT OF
                if (phys.getPosition().x < pos.x ){
                    gamePad.releaseButton(GameButton.MOVE_LEFT);
                    gamePad.pressButton(GameButton.MOVE_RIGHT);
                }else if (phys.getPosition().x > pos.x ){  // RIGHT OF
                    gamePad.releaseButton(GameButton.MOVE_RIGHT);
                    gamePad.pressButton(GameButton.MOVE_LEFT);
                }else{ //Release
                    gamePad.releaseButton(GameButton.MOVE_RIGHT);
                    gamePad.releaseButton(GameButton.MOVE_LEFT);
                }

                //Speed dash
                if(node.isLedge && node.position.x == phys.getPosition().x){
                    gamePad.pressButton(GameButton.ACTIVE_SKILL_BUTTON);
                }


                if (phys.getPosition().y < pos.y ){
                    gamePad.pressButton(GameButton.MOVE_UP);
                }else{
                    gamePad.releaseButton(GameButton.MOVE_UP);
                    //gamePad.pressButton(GameButton.MOVE_DOWN);
                }

            }

            return State.SUCCESS;
        }
    }



    /**
     * Stops at destination if it has arrived at the destination
     */
    public static class StopAtDestination extends Node{

        @Override
        public State update(Hashtable<String, Object> blackBoard) {

            Entity agent = (Entity) blackBoard.get("agent");
            PhysicsComponent phys = (PhysicsComponent) agent.getComponent(PhysicsComponent.ID);

            Vector2 destination = (Vector2)blackBoard.get("destination");

            if(GameMath.isMoreOrLess(phys.getPosition().x, destination.x, 2.0f) &&
                    GameMath.isMoreOrLess(phys.getPosition().y, destination.y, 2.0f)
                    ){
                blackBoard.remove("destination");
                return State.SUCCESS;
            }
            return State.RUNNING;
        }
    }


    /**
     * Finds the nearest health bonus object in order to heal
     */
    public class LocateNearestHealthBonus extends Node{
        @Override
        public State update(Hashtable<String, Object> blackBoard) {
            return null;
        }
    }



    /**
     * Behaviour setting the current ennemy as the next destination
     * @author TECH
     *
     */
    public static class SetEnemyAsTarget extends Node{
        @Override
        public State update(Hashtable<String, Object> blackBoard) {

            PhysicsComponent phys = (PhysicsComponent)
                    ((Entity)blackBoard.get("enemy")).getComponent(PhysicsComponent.ID);

            blackBoard.put("destination", phys.getPosition());
            return State.SUCCESS;
        }

    }





    /**
     * Takes an object
     */
    public class TakeObject extends Node{
        @Override
        public State update(Hashtable<String, Object> blackBoard) {
            return null;
        }
    }




    public static class OffensiveBehaviour extends Selector{
        @Override
        public boolean precondition(Hashtable<String, Object> blackBoard) {
            float health = ((HealthComponent)((Entity)blackBoard.get("agent"))
                    .getComponent(HealthComponent.ID)).getAmount();
            return health >= 25;
        }
    }


    /**
     * Attacks an enemy with a ranged weapon
     */
    public class AttackWithRangeWeapon extends Node{
        @Override
        public State update(Hashtable<String, Object> blackBoard) {

            return State.SUCCESS;
        }
    }

    /**
     * Attacks an enemy with a melee weapon
     */
    public static class AttackWithMeleeWeapon extends Node{
        @Override
        public State update(Hashtable<String, Object> blackBoard) {

            Entity agent = (Entity) blackBoard.get("agent");
            VirtualGamePad gamePad = (VirtualGamePad) agent.getComponent(VirtualGamePad.ID);

            gamePad.pressButton(GameButton.PRIMARY_ACTION_BUTTON);

            return State.SUCCESS;
        }
    }

}
